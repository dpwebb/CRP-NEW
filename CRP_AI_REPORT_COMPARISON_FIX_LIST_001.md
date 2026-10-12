# AI report comparison — FIX TODO evidence register

Created: October 11, 2026 (America/Halifax).
Authority: owner-requested fresh AI review of supplied sample credit reports, comparison with production CRP findings, and recording of every supported finding CRP missed.

Status: **Historical AU comparison COMPLETE. All eighteen TODOs IMPLEMENTED locally; final local regression passed.** The frozen production comparison contains 104 originals, 101 admissions, three refusals and 161 supported missed concerns with distinct confidence levels.

Latest explicit owner instruction (October 12): implement the recorded fixes and necessary tests in an isolated worktree; use the exact 104 originals, at most ten ingestion/comparison cycles per turn. Deployment, production configuration, purchases and consumer communications are not authorized.

This file records comparison evidence and corrective measures. Implementation scheduling remains in `CRP_VERSION_1_SEVEN_DAY_WORK_REGISTER_001.md`. The current task includes authorized local implementation and validation; local test success does not authorize deployment.

## Review procedure

1. Assign a case ID and identify the exact uploaded report. Record its file hash when available, bureau/layout, report date, selected assessment jurisdiction, CRP assessment time/build when available, and any consumer answers used. Mark unavailable metadata explicitly rather than inventing it.
2. Perform a fresh review of the report before using CRP's findings to guide the comparison. Record relevant printed facts, page/record locations, the reporting requirement or factual inconsistency, internal confidence, and material uncertainty. Verify source-dependent requirements as needed. CRP's existing detections are not the ceiling for the independent review.
3. Compare findings by their underlying issue and affected record, not wording or totals. Use the same jurisdiction, assessment date and supplied consumer facts; document material differences in inputs. Incomplete CRP results leave the comparison pending rather than proving a miss.
4. Record every supported AI finding absent from CRP as a FIX TODO. Identify the smallest correction through extraction, record association, rule coverage/applicability, evaluation, suppression, results display or packet eligibility as the evidence warrants. Distinguish a demonstrated cause from a proposed cause requiring diagnosis. Do not invent an exact code fix from output alone.
5. Consolidate repeated instances of the same demonstrated defect under one fix ID while retaining each case, finding and page-level reference. Different defects receive separate IDs.
6. Define acceptance evidence: the missed issue is detected from the supplied layout, reaches consumer selection and the selected packet where eligible, and a relevant benign/control case does not produce the issue. Closure requires demonstrated behavior; implementation, staging and production verification remain separate statuses.

Apply `CRP_OWNER_IMMUTABLE_VIOLATION_STANDARD_001.md`, including its October 10 expansion amendment. Newly identified supported common errors must be carried into the shared checklist and connected extraction/issue/packet path when implemented. Preserve internal confidence and source evidence; do not invent a legal finding or infer an error from a missing field without a supported requirement and report evidence.

Keep personal identifiers and report contents out of this source-controlled register. Use case/account aliases and minimum necessary fact summaries. Retain supplied reports and complete CRP outputs as private comparison artifacts; do not publish them or copy them into source control.

## Reviewed cases

### AU-BATCH-001 — first batch, preserved historical scope

AU source folder: the owner's private AU directory, identified in the private manifests. Complete direct-folder listing found 104 PDFs; this historical batch reviewed ten, leaving 94 unreviewed at that point. Other country folders were not reviewed. First-batch selection spans the three source brands and six regions rather than taking ten files from one layout/region. Drive identifiers remain in private storage.

Each cycle used one separate case, original-PDF text plus visual review of every page, an independently frozen AI review, the live Wizzard's authenticated upload/evaluate/full-result API routes, then comparison and recording. All 16 original pages were reviewed. All ten production blob hashes match the original downloaded bytes. No Your Story answers were supplied; payment, ownership and status statements discussed below are printed in the reports themselves.

Production origin: **https://creditregulatorpro.com**. Observed build throughout: **crp-v1-9799fd768cb7cdfa**, shipped source **6e8c85e29a815f6c0819056e8e9bc307b80900f5**. Actual assessments ran October 12, 2026, 02:46:27–02:47:06 UTC; CRP's assessment date was **October 11, 2026**, using **America/Halifax**. This is fresh comparison evidence, not a new release acceptance receipt.

New fictional test account: full access confirmed through **COMPLIMENTARY / SUBSCRIPTION** entitlement. Access expires November 11, 2026 at 02:44:16 UTC. No live charge, provider subscription or payment-event injection occurred. A root-only state snapshot and exact-existing-row assertions protected provisioning. The initial restart failed on the temporary system identity name; recorded ownership was restored by reference and production restarted successfully. Failed and recovered provisioning evidence is preserved privately. Existing code/configuration/release identity and the dirty checkout were preserved.

| Case | Original report | Report date as printed | Selected jurisdiction | AI issues retained | CRP findings | FIX TODOs |
|---|---|---|---|---|---|---|
| AU-001 | AU-Equifax-ACT-001.pdf | 06/06/2026 | AU-ACT | 2 | 0 | 001, 006 |
| AU-002 | AU-Experian-ACT-001.pdf | 21/06/2026 | AU-ACT | 2 | 0 | 001, 006 |
| AU-003 | AU-Illion-NSW-001.pdf | 13/06/2026 | AU-NSW | 2 | 0 | 002, 006 |
| AU-004 | AU-Experian-NSW-001.pdf | 22/06/2026 | AU-NSW | 2 | 0 | 003, 006 |
| AU-005 | AU-Equifax-NT-001.pdf | 14/06/2026 | AU-NT | 2 | 0 | 002, 006 |
| AU-006 | AU-Illion-NT-001.pdf | 23/06/2026 | AU-NT | 1 | 0 | 006 |
| AU-007 | AU-Equifax-QLD-001.pdf | 22/06/2026 | AU-QLD | 2 | 0 | 004, 006 |
| AU-008 | AU-Illion-QLD-001.pdf | 22/06/2026 | AU-QLD | 1 | 0 | 007 |
| AU-009 | AU-Experian-VIC-001.pdf | 29/06/2026 | AU-VIC | 2 | 0 | 002, 006 |
| AU-010 | AU-Illion-WA-001.pdf | 09/06/2026 | AU-WA | 2 | 0 | 005, 006 |

The source brand illion uses live CRP's offered **Experian (including former illion)** selection. Regions were selected from fixture filenames as test inputs, separately from address checking. A difference between selected assessment jurisdiction and a printed address is not an address finding.

Final internal confidence tally: **two definite factual discrepancies, nine probable address issues, seven potential verification concerns**. These are not 18 established statutory breaches. The original frozen reviews contained 19 candidates; `AI-AU-008-02` was withdrawn after review because a materially different alias does not affirmatively establish an incorrect identity. It remains context for the malformed-address issue and has no separate FIX TODO.

Private evidence directory: `C:\Users\webbd\.codex\private\crp-ai-comparison\2026-10-11-au-turn1`.

- [Comparison manifest](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-11-au-turn1/comparison-manifest.json) records report SHA-256, Drive ID/URL, live case/result IDs, assessment timestamps, every retained finding ID and its FIX TODO.
- [Comparison CSV](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-11-au-turn1/comparison-summary.csv) provides one row per report.
- Each private `AU-001`–`AU-010` directory contains the original PDF, page images, independent text, upload receipt and complete live API results. Frozen AI reviews, account-only extraction snapshot, original-byte continuity and diagnosis files remain private. Credentials and recovery keys are outside the repository and are excluded from comparison evidence.

### AU-BATCH-002 — October 12, 2026

The next ten unreviewed reports reuse the same full-access test account. No new entitlement grant, charge, service restart, runtime/configuration edit or deployment was performed by this task. The original dirty files were preserved. Report ingestion used ordinary authenticated production routes. Other concurrent tasks remain outside this comparison assignment.

All **15 original pages** were reviewed visually and through independently extracted text. The AI review was frozen before any of these ten CRP assessments, and its SHA-256 is preserved. All ten complete live results returned **zero consumer findings**, with complete assessment/subscriber access confirmed. Original PDF bytes match their production blobs. Build observed before, during diagnostic source inspection and after the batch: **crp-v1-9799fd768cb7cdfa**; CRP assessment date **October 12, 2026**, America/Halifax. Exact case/result IDs, hashes and times are in the private comparison manifest.

This batch adds **16 supported missed issue instances**: **one definite displayed format discrepancy, eleven probable concerns, four potential verification concerns**. Ten are locality/state accuracy instances, one is malformed postcode format, two concern old court entries, one is account ownership denial, one is the expressly disputed Charge Off status, and one is a probable duplicate account. The report scenario names are not finding evidence. Thinness, absent authorization columns, ordinary paid accounts and alias differences alone were not asserted errors.

| Case | Original report | Report date as printed | Selected jurisdiction | AI issues retained | CRP findings | FIX TODOs |
|---|---|---|---|---|---|---|
| AU-011 | AU-Equifax-ACT-002.pdf | 09/06/2026 | AU-ACT | 2 | 0 | 006, 008 |
| AU-012 | AU-Experian-ACT-002.pdf | 26/06/2026 | AU-ACT | 2 | 0 | 004, 006 |
| AU-013 | AU-Illion-NSW-002.pdf | 01/07/2026 | AU-NSW | 1 | 0 | 006 |
| AU-014 | AU-Experian-NSW-002.pdf | 24/06/2026 | AU-NSW | 2 | 0 | 006, 008 |
| AU-015 | AU-Equifax-NT-002.pdf | 04/06/2026 | AU-NT | 1 | 0 | 006 |
| AU-016 | AU-Illion-NT-002.pdf | 03/06/2026 | AU-NT | 1 | 0 | 006 |
| AU-017 | AU-Equifax-QLD-002.pdf | 22/06/2026 | AU-QLD | 1 | 0 | 006 |
| AU-018 | AU-Illion-QLD-002.pdf | 22/06/2026 | AU-QLD | 2 | 0 | 006, 009 |
| AU-019 | AU-Experian-VIC-002.pdf | 25/06/2026 | AU-VIC | 2 | 0 | 005, 006 |
| AU-020 | AU-Illion-WA-002.pdf | 12/06/2026 | AU-WA | 2 | 0 | 006, 007 |

Two new TODOs are recorded below; repeat instances extend four existing TODOs rather than duplicating them. The cumulative total is **34 issue instances across 20 reviewed reports**, with **84 of the 104 AU PDFs still unreviewed**. Previous assessment results and the first-batch evidence remain unchanged.

Private second-batch evidence: [comparison manifest](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn2/comparison-manifest.json), [comparison CSV](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn2/comparison-summary.csv), [frozen independent review](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn2/independent-ai-AU-011-020.json), [confirmed diagnosis and proposed controls](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn2/comparison_diagnosis.json). Original PDFs, rendered pages, raw results, account-only extraction snapshot and byte continuity stay in that private directory, outside source control.

### AU-BATCH-003 — October 12, 2026

Ten further unreviewed originals were processed with the same full-access account. All **13 original pages** were visually reviewed and independently extracted; the AI review was frozen before these CRP assessments. All ten complete live results contained **zero consumer findings**. Original SHA-256 values match production blobs. Observed production build remains **crp-v1-9799fd768cb7cdfa**, and CRP's assessment date was **October 12, 2026**. No code/configuration changes, entitlement grants, charges, deployments, service restarts or extra diagnostic report cycles were performed by this task.

This batch records **13 supported missed issue instances**: ten probable address concerns, one definite printed Open/closed contradiction, one potential old-court-entry verification concern and one potential consumer-disputed delinquency-status concern. These extend four existing TODOs; no new TODO ID is required.

| Case | Original report | AI issues retained | CRP findings | FIX TODOs |
|---|---|---|---|---|
| AU-021 | AU-Equifax-ACT-003.pdf | 1 | 0 | 006 |
| AU-022 | AU-Experian-ACT-003.pdf | 1 | 0 | 006 |
| AU-023 | AU-Experian-NSW-003.pdf | 1 | 0 | 006 |
| AU-024 | AU-Equifax-QLD-003.pdf | 1 | 0 | 006 |
| AU-025 | AU-Illion-QLD-003.pdf | 1 | 0 | 006 |
| AU-026 | AU-Experian-QLD-001.pdf | 1 | 0 | 006 |
| AU-027 | AU-Illion-VIC-002.pdf | 2 | 0 | 006, 008 |
| AU-028 | AU-Equifax-VIC-001.pdf | 2 | 0 | 003, 006 |
| AU-029 | AU-Illion-WA-003.pdf | 1 | 0 | 006 |
| AU-030 | AU-Equifax-WA-001.pdf | 2 | 0 | 005, 006 |

Nonfindings retained honestly: AU-021/023 explicitly say payment history is unavailable, but the originals do not establish an applicable mandatory reporting duty and its breach. AU-026's hard inquiry says Authorization not verified; this is neither consumer denial nor affirmative proof of unauthorized access. AU-022/025's bankruptcy-included accounts have zero balances, and the 2024 Filed/Discharged entries do not establish expired retention or wrong balances. Scenario words embedded in report identifiers are not findings. No missing-history, unauthorized-inquiry or bankruptcy-error TODO is invented from these observations. [OAIC access guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/third-party-access-to-credit-reports) and [repayment-history guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/repayment-history-and-defaults) were checked.

The cumulative total is **47 supported missed instances across 30 reviewed AU reports**, with **74 of the 104 listed AU PDFs unreviewed**. Previous results and evidence remain unchanged. Private third-batch evidence: [comparison manifest](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn3/comparison-manifest.json), [CSV](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn3/comparison-summary.csv), [frozen review](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn3/independent-ai-AU-021-030.json), [live-extraction diagnosis](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn3/diagnosis.json). Case IDs, assessment/report dates, source hashes, page locations and each finding-to-fix link are preserved there.

## FIX TODO list — cumulative

| FIX TODO | Missed issue / instances | Affected cases | Required correction | Status |
|---|---|---|---|---|
| FIX-TODO-001 | Report-owned payment statement versus Open/Unpaid status / 7 | AU-001, AU-002, AU-059, AU-067, AU-084, AU-087, AU-104 | Preserve typed collection/default status, paid claim/date and amount meaning; factual paid-status verification and selected packet | IMPLEMENTED locally |
| FIX-TODO-002 | Collection still listed with last-reported evidence in 2020 / 6 | AU-003, AU-005, AU-009, AU-064, AU-069, AU-071 | Preserve collection date meanings and add qualified old-listing verification without inventing a statutory start | IMPLEMENTED locally |
| FIX-TODO-003 | Same account shown Open and described as closed / 8 | AU-004, AU-028, AU-035, AU-054, AU-058, AU-065, AU-101, AU-104 | Link current status to its closure narrative and assess their disagreement without requiring an invented closure date | IMPLEMENTED locally |
| FIX-TODO-004 | Reported account with explicit consumer ownership denial / 4 | AU-007, AU-012, AU-034, AU-048 | Repair account-section/table extraction and admit an account-bound ownership-verification branch | IMPLEMENTED locally |
| FIX-TODO-005 | Attributed adverse-status or dated-RHI dispute / 8 | AU-010, AU-019, AU-030, AU-032, AU-036, AU-051, AU-066, AU-104 | Bind disputed current status or dated post-sale RHI to its own source statement; qualified verification and packet | IMPLEMENTED locally |
| FIX-TODO-006 | Inconsistent printed locality/state/postcode combinations / 87 | AU-001–007, AU-009–088 | Read two-column identity blocks, validate supported within-address geography, and allow qualified issue/packet projection | IMPLEMENTED locally |
| FIX-TODO-007 | Australian previous-address postcode has six alphanumeric characters / 6 | AU-008, AU-020, AU-041, AU-045, AU-062, AU-085 | Extract the address faithfully and add country-scoped postcode-format validation with issue/packet projection | IMPLEMENTED locally |
| FIX-TODO-008 | Older Civil Judgment remains listed with a 2017 Filed date / 5 | AU-011, AU-014, AU-027, AU-057, AU-068 | Preserve public-record table event meanings and add qualified old-entry verification without treating filing as judgment-made date | IMPLEMENTED locally |
| FIX-TODO-009 | Corroborated repeated account rows / 6 | AU-018, AU-037, AU-038, AU-046, AU-056, AU-088 | Extract masked identity, identifying dates and independent status/amount facts so duplicate pairing can assess both physical rows | IMPLEMENTED locally |
| FIX-TODO-010 | Account balance explicitly disputed by the consumer / 3 | AU-033, AU-050, AU-079 | Preserve typed balance/currency and its attributed dispute; add bounded balance-accuracy verification through checklist, selection and packet | IMPLEMENTED locally |
| FIX-TODO-011 | Inquiry authorization/purpose dispute / 4 | AU-039, AU-070, AU-080, AU-104 | Preserve inquiry purpose and explicit authorization/application denial, without making consent universally mandatory | IMPLEMENTED locally |
| FIX-TODO-012 | Report-issued date versus later printed account updates warrants qualified verification / 4 | AU-096–099 | Retain raw report date, source location and alternatives; reuse chronology comparison with bounded verification when convention unresolved | IMPLEMENTED locally |
| FIX-TODO-013 | Paid account status beside positive printed AUD balance / 2 | AU-097, AU-098 | Normalize explicit AUD-prefixed labelled amounts and reuse existing paid-status/balance check with same-account source custody and packet | IMPLEMENTED locally |
| FIX-TODO-014 | AU category-specific retention and current-file review / 7 | AU-101 (five), AU-102, AU-103 | Repair unbranded disclosure admission and dated default/enquiry/hardship/RHI mapping; reuse exact category clocks and dual-date review | IMPLEMENTED locally |
| FIX-TODO-015 | Consumer-credit default amount below $150 / 1 | AU-101 | Admit/read native default table and verify original overdue amount/category against AU minimum without confusing residual balance | IMPLEMENTED locally |
| FIX-TODO-016 | Linked hardship summary and monthly A indicators differ / 1 | AU-101 | Bind same-account dated A cells to hardship range; qualified source-representation verification | IMPLEMENTED locally |
| FIX-TODO-017 | Consumer disputes linked original/purchaser reporting / 1 | AU-104 | Preserve distinct roles and attributed duplicate concern; verify relationship without weakening strict duplicate or double-balance safeguards | IMPLEMENTED locally |
| FIX-TODO-018 | Same-account default date precedes printed opening / 1 | AU-101 | Preserve cross-section exact account association and event meanings; bounded opening/default chronology verification | IMPLEMENTED locally |

### AU-BATCH-004 — October 12, 2026

The next ten unreviewed originals reused the same full-access test account. All **15 pages** were visually reviewed with independent native-text extraction. The independent review was frozen and hashed before any of these CRP assessments. All ten full results returned **zero issues and zero common errors**, with complete subscription assessment and packet entitlement confirmed. Each original PDF hash matches its production blob. The observed build remains **crp-v1-9799fd768cb7cdfa**, assessment date **October 12, 2026**, America/Halifax. No consumer answers were supplied; attributed claims are printed in the reports. No code/configuration edits, entitlement grants, charges, deployments, service restarts or additional report cycles were performed by this task.

This batch adds **18 supported missed issue instances**: ten probable address concerns, two probable repeated-account concerns, one definite printed Open/closed contradiction, two potential status disputes, one potential ownership denial, one potential balance dispute and one potential inquiry-verification concern. Internal confidence: **one definite, twelve probable, five potential**. Two new TODOs are added and five existing TODOs extended. Cumulative: **40 of 104 AU reports reviewed, 65 missed instances, eleven OPEN TODOs; 64 reports remain**.

| Case | Original report | AI issues retained | CRP findings | FIX TODOs |
|---|---|---|---|---|
| AU-031 | AU-Equifax-ACT-004.pdf | 1 | 0 | 006 |
| AU-032 | AU-Equifax-QLD-004.pdf | 2 | 0 | 005, 006 |
| AU-033 | AU-Illion-QLD-004.pdf | 2 | 0 | 006, 010 |
| AU-034 | AU-Experian-QLD-002.pdf | 2 | 0 | 004, 006 |
| AU-035 | AU-Illion-VIC-003.pdf | 2 | 0 | 003, 006 |
| AU-036 | AU-Equifax-WA-002.pdf | 2 | 0 | 005, 006 |
| AU-037 | AU-Experian-WA-002.pdf | 2 | 0 | 006, 009 |
| AU-038 | AU-Illion-WA-004.pdf | 2 | 0 | 006, 009 |
| AU-039 | AU-Illion-SA-001.pdf | 2 | 0 | 006, 011 |
| AU-040 | AU-Illion-SA-002.pdf | 1 | 0 | 006 |

AU-031's original charge-off and collection for the same debt do not establish duplicate debt or payment. Its generic consumer-statement caption supplies no statement contents. AU-040's 2024 Filed/Discharged bankruptcy and zero-balance included account do not establish expiry or wrong balance; its payment field alone does not establish an ongoing collection demand. Aliases and scenario labels remain context only. The disputed balance exceeding its limit is not independently an error.

Private evidence: [comparison manifest](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn4/comparison-manifest.json), [comparison CSV](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn4/comparison-summary.csv), [frozen independent review](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn4/independent-ai-AU-031-040.json), [live extraction diagnosis](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn4/diagnosis.json). Originals, all page renders, complete results, exact account-only snapshots and byte-continuity proof remain private outside source control.

### AU-BATCH-005 — remaining-64 goal, first ten

Owner instruction: complete the remaining 64 AU reports. The standing **ten cycles per turn** limit is preserved; this batch completes ten, leaving **54**. The same full-access account was verified and reused. All **14 pages** were independently extracted and visually reviewed, and the AI review was frozen before the new live evaluations. Ten full subscription-access results returned **zero issues and zero common errors**. Each original hash matches its live upload blob. Build remained **crp-v1-9799fd768cb7cdfa**; assessment date **October 12, 2026**, America/Halifax. No consumer answers were added. No product code/configuration changes, charges, entitlement grants, deployments, service restarts or extra report cycles occurred.

The batch adds **15 missed concerns**: ten probable address issues, two definite displayed postcode-format discrepancies, one probable repeated-account concern, one potential attributed ownership denial and one potential balance dispute. Five existing TODOs are extended; no new TODO ID. Cumulative: **50/104 reports reviewed, 80 supported missed instances, eleven OPEN TODOs**. These are not 80 established statutory breaches.

| Case | Original report | Printed report date | Selected jurisdiction | AI concerns | CRP findings | FIX TODOs |
|---|---|---|---|---|---|---|
| AU-041 | AU-Experian-NT-001.pdf | 28/06/2026 | AU-NT | 2 | 0 | 006, 007 |
| AU-042 | AU-Experian-NT-002.pdf | 01/06/2026 | AU-NT | 1 | 0 | 006 |
| AU-043 | AU-Equifax-VIC-002.pdf | 18/06/2026 | AU-VIC | 1 | 0 | 006 |
| AU-044 | AU-Illion-VIC-001.pdf | 16/06/2026 | AU-VIC | 1 | 0 | 006 |
| AU-045 | AU-Equifax-WA-003.pdf | 13/06/2026 | AU-WA | 2 | 0 | 006, 007 |
| AU-046 | AU-Equifax-WA-004.pdf | 16/06/2026 | AU-WA | 2 | 0 | 006, 009 |
| AU-047 | AU-Experian-WA-001.pdf | 19/06/2026 | AU-WA | 1 | 0 | 006 |
| AU-048 | AU-Equifax-TAS.pdf | 11/06/2026 | AU-TAS | 2 | 0 | 004, 006 |
| AU-049 | AU-Illion-TAS.pdf | 07/06/2026 | AU-TAS | 1 | 0 | 006 |
| AU-050 | AU-Experian-QLD-003.pdf | 22/06/2026 | AU-QLD | 2 | 0 | 006, 010 |

Private evidence: [comparison manifest](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn5/comparison-manifest.json), [comparison CSV](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn5/comparison-summary.csv), [frozen AI review](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn5/independent-ai-AU-041-050.json), [actual extraction diagnosis](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn5/diagnosis.json). Originals, all page images, actual full results, exact scoped extraction snapshots and original-byte proof remain private.

AU-042/044 print 60 Days Late and Account previously past due, but have no explicit dispute/resolution claim and no dated history cells or direction. Neither is asserted a wrong-status concern. AU-049's unavailable payment history does not establish a breached mandatory reporting duty. AU-047's thin file is not an error. AU-041/045's materially different aliases do not alone establish mixed identities; their source-owned postcode discrepancies and separate address geography support the retained concerns. No guessed correct address or balance is supplied.

### AU-BATCH-006 — remaining-64 goal, second ten

Ten further unreviewed originals were reviewed with the same verified full-access test account. All **12 pages** were read visually and through original-PDF text extraction. The independent review was frozen before the ten live assessments. All full results returned **zero issues and zero common errors**, with complete subscriber assessment/packet access confirmed. All original PDF hashes match live upload blobs. Build **crp-v1-9799fd768cb7cdfa** and assessment date **October 12, 2026**, America/Halifax, remain recorded. No consumer answers, charges, entitlement changes, code/configuration changes, deployments, restarts or extra report cycles were introduced.

Added **16 supported missed concerns**: ten probable address concerns, two definite printed Open/Closed-date/closure-narrative contradictions, one probable repeated-account concern, one potential disputed status, one potential older court-entry verification and one potential paid-collection verification. Six existing TODOs extended; no new ID. Cumulative **60/104 reports, 96 missed instances, eleven OPEN TODOs; 44 reports remain**. Confidence reflects report evidence, not established statutory liability.

| Case | Original report | AI concerns | CRP findings | FIX TODOs |
|---|---|---|---|---|
| AU-051 | AU-Experian-QLD-004.pdf | 2 | 0 | 005, 006 |
| AU-052 | AU-Equifax-QLD-005.pdf | 1 | 0 | 006 |
| AU-053 | AU-Experian-QLD-005.pdf | 1 | 0 | 006 |
| AU-054 | AU-Illion-QLD-005.pdf | 2 | 0 | 003, 006 |
| AU-055 | AU-Equifax-QLD-006.pdf | 1 | 0 | 006 |
| AU-056 | AU-Experian-QLD-006.pdf | 2 | 0 | 006, 009 |
| AU-057 | AU-Illion-QLD-006.pdf | 2 | 0 | 006, 008 |
| AU-058 | AU-Equifax-QLD-007.pdf | 2 | 0 | 003, 006 |
| AU-059 | AU-Experian-QLD-007.pdf | 2 | 0 | 001, 006 |
| AU-060 | AU-Illion-QLD-007.pdf | 1 | 0 | 006 |

All ten printed report dates are 22/06/2026; selected assessment region is AU-QLD. No other report was used as cross-bureau proof. AU-052's Authorization not verified remains an observation; absence of verified authorization does not prove unauthorized access. AU-053/055's unavailable history does not establish a breached mandatory reporting duty. AU-060's thin file is not an error. Scenario names and ordinary aliases are not finding evidence.

Private evidence: [comparison manifest](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn6/comparison-manifest.json), [comparison CSV](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn6/comparison-summary.csv), [frozen independent AI review](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn6/independent-ai-AU-051-060.json), [actual live extraction diagnosis](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn6/diagnosis.json). Originals, rendered pages, complete live results, own-case-only snapshots and byte continuity remain private.

### AU-BATCH-007 — remaining-64 goal, third ten

Ten further original AU reports were independently reviewed before live evaluation using the same verified full-access test account. All **14 pages** were visually reviewed and independently extracted. Frozen review hashes precede the actual assessment timestamps. Ten complete subscriber results returned **zero issues and zero common errors**; each original SHA-256 matches the production blob. Observed build **crp-v1-9799fd768cb7cdfa**, assessment date **October 12, 2026**, America/Halifax. Selected assessment region AU-QLD for all ten; no consumer answers added and no cross-report comparisons used as finding evidence. No code/configuration changes, entitlement grants, charges, deployments, restarts or extra report cycles were performed by this task.

This batch adds **18 supported missed concerns**: ten probable address concerns, one definite malformed postcode, one definite printed closure contradiction and six potential verification concerns (two stale collections, one paid-collection claim, one disputed status, one older court entry and one inquiry marked Authorized No). Eight existing TODOs extended; no new ID. Cumulative **70/104 reports reviewed, 114 missed instances, eleven OPEN TODOs; 34 remain**. Supported concerns are not established statutory liability.

| Case | Original report | Printed report date | AI concerns | CRP findings | FIX TODOs |
|---|---|---|---|---|---|
| AU-061 | AU-Equifax-QLD-008.pdf | 22/06/2026 | 1 | 0 | 006 |
| AU-062 | AU-Experian-QLD-008.pdf | 22/06/2026 | 2 | 0 | 006, 007 |
| AU-063 | AU-Illion-QLD-008.pdf | 22/06/2026 | 1 | 0 | 006 |
| AU-064 | AU-Equifax-QLD-009.pdf | 22/06/2026 | 2 | 0 | 002, 006 |
| AU-065 | AU-Experian-QLD-009.pdf | 22/06/2026 | 2 | 0 | 003, 006 |
| AU-066 | AU-Illion-QLD-009.pdf | 22/06/2026 | 2 | 0 | 005, 006 |
| AU-067 | AU-Equifax-QLD-010.pdf | 22/06/2026 | 2 | 0 | 001, 006 |
| AU-068 | AU-Experian-QLD-010.pdf | 22/06/2026 | 2 | 0 | 006, 008 |
| AU-069 | AU-Illion-QLD-010.pdf | 22/06/2026 | 2 | 0 | 002, 006 |
| AU-070 | AU-Equifax-QLD-011.pdf | 12/06/2026 | 2 | 0 | 006, 011 |

AU-061's clean-report scenario name does not negate its printed address concerns. AU-062's materially different aliases alone do not establish mixed identity. AU-063's 60 Days Late, Account previously past due and undated history have no explicit resolution/dispute claim, so no wrong-status issue is asserted. No intended correct address, account balance or date convention is invented.

Private evidence: [comparison manifest](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn7/comparison-manifest.json), [comparison CSV](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn7/comparison-summary.csv), [frozen AI review](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn7/independent-ai-AU-061-070.json), [actual scoped extraction diagnosis](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn7/diagnosis.json). Originals, all renders, complete outputs and original-byte continuity stay private outside source control.

### AU-BATCH-008 — remaining-64 goal, fourth ten

Ten further unreviewed originals used the same verified full-access test account. All **15 pages** were independently extracted and visually reviewed; the AI review was frozen and hashed before live assessment. All ten complete subscriber-access results returned **zero issues and zero common errors**. Original hashes match production upload blobs. Build **crp-v1-9799fd768cb7cdfa**, assessment date **October 12, 2026**, America/Halifax; all selected assessment regions AU-QLD. No consumer answers added. No code/configuration edits, entitlement changes, charges, deployment, restart or extra report cycles occurred.

Added **13 supported missed concerns**: ten probable address concerns and three potential verification concerns (one stale collection, one explicit balance dispute, one inquiry marked Authorized No). Four existing TODOs extended; no new ID. Cumulative **80/104 reports reviewed, 127 missed instances, eleven OPEN TODOs; 24 remain**. Report evidence supports qualified concerns, not established statutory liability.

| Case | Original report | Printed report date | AI concerns | CRP findings | FIX TODOs |
|---|---|---|---|---|---|
| AU-071 | AU-Experian-QLD-011.pdf | 22/06/2026 | 2 | 0 | 002, 006 |
| AU-072 | AU-Illion-QLD-011.pdf | 22/06/2026 | 1 | 0 | 006 |
| AU-073 | AU-Equifax-QLD-012.pdf | 05/06/2026 | 1 | 0 | 006 |
| AU-074 | AU-Experian-QLD-012.pdf | 22/06/2026 | 1 | 0 | 006 |
| AU-075 | AU-Illion-QLD-012.pdf | 22/06/2026 | 1 | 0 | 006 |
| AU-076 | AU-Equifax-QLD-013.pdf | 22/06/2026 | 1 | 0 | 006 |
| AU-077 | AU-Experian-QLD-013.pdf | 22/06/2026 | 1 | 0 | 006 |
| AU-078 | AU-Illion-QLD-013.pdf | 22/06/2026 | 1 | 0 | 006 |
| AU-079 | AU-Equifax-QLD-014.pdf | 22/06/2026 | 2 | 0 | 006, 010 |
| AU-080 | AU-Experian-QLD-014.pdf | 27/06/2026 | 2 | 0 | 006, 011 |

AU-072's Authorization not verified is unknown, not affirmative denial. AU-075's unavailable history does not establish a breached mandatory reporting duty. AU-077's 60 Days Late with undated history and Account previously past due does not establish resolution or incorrect status. AU-073/074/076 have zero-balance bankruptcy-included accounts and 2024 Filed/Discharged records, without a discharge date establishing retention expiry; a payment field alone does not prove an ongoing collection demand. Ordinary paid accounts, aliases and scenario names are not errors. [OAIC retention guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/what-stays-on-a-credit-report) preserves the later-of bankruptcy clock; no shorter clock or immediate removal on discharge is invented.

Private evidence: [comparison manifest](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn8/comparison-manifest.json), [comparison CSV](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn8/comparison-summary.csv), [frozen AI review](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn8/independent-ai-AU-071-080.json), [actual extraction diagnosis](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn8/diagnosis.json). Originals, all page renders, full actual results, scoped extraction snapshots and byte-continuity proof remain private.

### AU-BATCH-009 — remaining-64 goal, fifth ten

Ten further unreviewed originals used the same verified full-access account. All **13 pages** were independently extracted and visually reviewed, and the AI review was frozen and hashed before live assessment. All ten complete subscription-access results returned **zero issues and zero common errors**. Each original SHA-256 matches its production blob. Build **crp-v1-9799fd768cb7cdfa**, assessment date **October 12, 2026**, America/Halifax. No consumer answers added. No code/configuration edits, entitlement changes, charges, deployments, restarts or extra report cycles occurred.

Added **12 supported missed concerns**: eight probable address concerns, one probable repeated account, one definite malformed postcode and two potential attributed paid-collection claims. Four existing TODOs extended; no new ID. Cumulative **90/104 reports reviewed, 139 missed instances, eleven OPEN TODOs; 14 remain**. These are evidence-bounded concerns, not established statutory liability.

| Case | Original report | Printed report date | AI concerns | CRP findings | FIX TODOs |
|---|---|---|---|---|---|
| AU-081 | AU-Illion-QLD-014.pdf | 22/06/2026 | 1 | 0 | 006 |
| AU-082 | AU-Equifax-QLD-015.pdf | 22/06/2026 | 1 | 0 | 006 |
| AU-083 | AU-Experian-QLD-015.pdf | 22/06/2026 | 1 | 0 | 006 |
| AU-084 | AU-Illion-QLD-015.pdf | 05/06/2026 | 2 | 0 | 001, 006 |
| AU-085 | AU-Equifax-QLD-016.pdf | 22/06/2026 | 2 | 0 | 006, 007 |
| AU-086 | AU-Experian-QLD-016.pdf | 22/06/2026 | 1 | 0 | 006 |
| AU-087 | AU-Illion-QLD-016.pdf | 22/06/2026 | 2 | 0 | 001, 006 |
| AU-088 | AU-Equifax-QLD-017.pdf | 22/06/2026 | 2 | 0 | 006, 009 |
| AU-089 | AU-Equifax-NO_CURRENT_ADDRESS-001.pdf | 22/06/2026 | 0 | 0 | None |
| AU-090 | AU-Experian-NO_CURRENT_ADDRESS-001.pdf | 22/06/2026 | 0 | 0 | None |

All selected assessment regions are AU-QLD. AU-089/090 are no-hit/sparse disclosures with no current or previous address, accounts, history, collections, public records or inquiries, explicitly stating no account file returned. They have **zero retained AI concerns**. AU-QLD was selected solely as a test input required by the live case API, not an inferred residence or report-established regional fact. These controls do not establish broad compliance or prove mandatory information was omitted. No cross-report facts were borrowed to create a finding. AU-082's undated late history without resolution/dispute is not a wrong-status issue; ordinary aliases and clean-report scenario names are not finding evidence.

Private evidence: [comparison manifest](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn9/comparison-manifest.json), [comparison CSV](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn9/comparison-summary.csv), [frozen independent review](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn9/independent-ai-AU-081-090.json), [actual scoped extraction diagnosis](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn9/diagnosis.json). Originals, all rendered pages, full actual results, own-case snapshots and byte continuity remain private.

### AU-BATCH-010 — remaining-64 goal, sixth ten

Ten remaining originals used the same verified full-access account. All **15 pages** were independently extracted and visually reviewed; the AI review was frozen before live assessment. All ten complete subscriber results returned **zero consumer findings**. AU-100 additionally returned a nonfinding `NOT_DETECTED` chronology-check observation (`is_a_finding=false`, no source records); the other nine common-error arrays were empty. This corrects the earlier empty-check-list wording without changing original result evidence or totals. Original hashes match production blobs. Build **crp-v1-9799fd768cb7cdfa**, assessment date **October 12, 2026**, America/Halifax. No code/configuration edits, consumer answers, entitlement grants, charges, deployments, restarts or extra report cycles.

Six supported AI concerns were missed: **four potential report-chronology verification concerns and two probable Paid-status/positive-balance concerns**. Two new TODOs are recorded. Cumulative **100/104 AU reports reviewed, 145 missed instances, thirteen OPEN TODOs; four remain**. Dates are preserved as printed, with ambiguity and alternatives; no definite future-date breach is asserted.

| Case | Original report | Printed report date | Selected jurisdiction | AI concerns | CRP findings | FIX TODOs |
|---|---|---|---|---|---|---|
| AU-091 | AU-Illion-NO_CURRENT_ADDRESS-001.pdf | 22/06/2026 | AU-QLD | 0 | 0 | None |
| AU-092 | AU-Equifax-NO_CURRENT_ADDRESS-002.pdf | 03/06/2026 | AU-QLD | 0 | 0 | None |
| AU-093 | AU-Experian-NO_CURRENT_ADDRESS-002.pdf | 18/06/2026 | AU-QLD | 0 | 0 | None |
| AU-094 | AU-Illion-NO_CURRENT_ADDRESS-002.pdf | 02/06/2026 | AU-QLD | 0 | 0 | None |
| AU-095 | AU-Illion-NO_CURRENT_ADDRESS-003.pdf | 22/06/2026 | AU-QLD | 0 | 0 | None |
| AU-096 | equifax-au_au_equifax_open_status_positive_balance_seed-4100.pdf | 10/01/2026 | AU-NSW | 1 | 0 | 012 |
| AU-097 | equifax-au_au_equifax_paid_status_positive_balance_seed-4100.pdf | 10/01/2026 | AU-NSW | 2 | 0 | 012, 013 |
| AU-098 | equifax-au_au_equifax_paid_status_wrong_jurisdiction_seed-4100.pdf | 10/01/2026 | AU-NSW | 2 | 0 | 012, 013 |
| AU-099 | equifax-au_au_equifax_paid_status_zero_balance_seed-4100.pdf | 10/01/2026 | AU-NSW | 1 | 0 | 012 |
| AU-100 | equifax-au_clean_seed-4100.pdf | 22/06/2026 | AU-NSW | 0 | 0 | None |

AU-091–095 have no current/previous address or account file returned and no retained AI concerns. AU-QLD is an explicit required test input, not inferred residence. AU-096–100 print a Sydney NSW address; select AU-NSW, separately from their valid address geography. AU-098's wrong_jurisdiction filename is not evidence of a report mismatch; no such finding is retained. Open with positive balance (AU-096), Paid with zero balance (AU-099), historical scheduled payments and consistent current accounts (AU-100) remain controls. AU-100 has no retained AI concern. No facts or expected outcomes were borrowed from the scenario names.

Private evidence: [comparison manifest](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn10/comparison-manifest.json), [comparison CSV](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn10/comparison-summary.csv), [frozen AI review](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn10/independent-ai-AU-091-100.json), [actual extraction diagnosis](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn10/diagnosis.json). Originals, all renders, full actual results and original-byte continuity stay private.

### AU-BATCH-011 — final four originals

The final four originals used the same verified full-access test account, with **four cycles** in this turn. All **nine pages** were independently extracted and visually reviewed; the AI review was frozen before live assessment. Complete result responses are saved for all four. Each original hash matches its live blob. Build **crp-v1-9799fd768cb7cdfa**, assessment date **October 12, 2026**, America/Halifax; test route AU-NSW / EQUIFAX. These generic/mixed-style samples do not establish a single actual bureau issuer; the selection is an explicit test input, not an invented provenance fact. No source processing instructions, fixture expected outcomes or external attachment claims were adopted as authority.

The batch adds **16 supported missed concerns**: **three definite printed discrepancies, four probable concerns and nine potential verification/current-file concerns**. Five new TODO IDs and four existing extensions are recorded. Actual first blockers are distinguished: AU-101/102/103 were refused as **UNRELATED_DOCUMENT**, with no extracted records, so their eleven missed concerns are admission-blocked, not completed substantive checks. AU-104 was admitted generally but returned zero findings and has row/date/statement-association gaps. Nothing here represents those refusals as successful parsing or treats zero findings as compliance.

| Case | Original report | AI concerns | CRP findings | Actual admission | FIX TODOs |
|---|---|---|---|---|---|
| AU-101 | CRP_AU_NSW_report_A.pdf | 9 | 0 | REFUSED | 003, 014, 015, 016, 018 |
| AU-102 | CRP_AU_NSW_report_B.pdf | 1 | 0 | REFUSED | 014 |
| AU-103 | CRP_AU_NSW_admin_sample_upload_clean_control.pdf | 1 | 0 | REFUSED | 014 |
| AU-104 | CRP_AU_NSW_admin_sample_upload_issue_rich.pdf | 5 | 0 | ADMITTED_GENERAL | 001, 003, 005, 011, 017 |

Historical/current boundaries: AU-102's closed September 2024 loan was inside the two-year liability period on its June 2026 report date; the one-month destruction window after September 2026 expiry had not ended on October 12, so no expired-closed-account breach is asserted. The dated early-2024 RHI in AU-101/102 supports a **current-file verification** concern as periods have since ended; an old PDF does not prove the bureau still holds the entry today. AU-103's enquiry date 12/02/2021 retains February/December alternatives. Over-limit balance, closed account with nonzero balance, absent notice/licence fields and ordinary aliases do not independently establish errors. AU-104's original zero/purchaser positive balances do not establish double debt. No referenced receipt, account statement or identity evidence was actually attached to this task.

Private evidence: [comparison manifest](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn11/comparison-manifest.json), [comparison CSV](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn11/comparison-summary.csv), [frozen independent review](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn11/independent-ai-AU-101-104.json), [actual extraction diagnosis](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn11/diagnosis.json). Originals and complete responses stay private.

### Full AU completion audit

Fresh Drive listing contains **104 PDF IDs**. All 104 have exactly one reviewed/submitted cycle, an independent review timestamp before its new assessment, original PDF hash and all rendered pages, full result response and same-account case/result ownership. Read-only inspection of **all 104 live cases/results/blobs** confirms source-byte equality, **101 admitted / three refused**, and zero consumer findings. All **151 original pages** are represented. The owner-requested remaining-64 goal completed **64 cycles and added 96 supported missed concerns**, without exceeding ten cycles in any turn. Cumulative **161 missed concerns across eighteen OPEN TODOs**: 15 definite printed discrepancies, 99 probable concerns and 47 potential concerns. These are not 161 established statutory breaches. No AU PDFs remain unreviewed. The original alias-only candidate withdrawal remains preserved.

The audit also corrects AU-100's empty-common-error wording: one nonfinding chronology observation exists, not a consumer finding. Seven diagnostic source modules match the active production release. Failed audit attempts caused by result-response schema assumptions are retained privately; the final audit independently verifies the actual rendered-result schema and all cases. [Completion audit](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn11/completion-audit.json), [fresh full inventory](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn11/final-drive-inventory.json), [all-case live verification](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-12-au-turn11/final-live-104-case-verification.json).

This completes the review/comparison and FIX TODO recording task, including documented CRP refusals. It does not implement fixes, certify detection coverage, or close release blockers. All product fixes remain pending the owner's explicit instruction to run the fix list. During the remaining-64 goal no code/configuration edits, deployments, restarts, entitlement grants or charges were performed by this task.

### Shared corrective mechanism

Several TODOs share the same extraction dependency; they are not seven unrelated parser rewrites. Reuse one bounded native AU table mapping for the observed account/collection layouts, optional Closed/Limit/Payment columns, wrapped rows and remarks, with reliable account association and page/word evidence. Preserve balance versus historical amount semantics and explicit AUD currency. Generic fallback currently embeds statuses in identity text, treats labelled monetary fields as anonymous amounts and can label explicit AUD amounts `USD_SYMBOL_PRINTED`.

Identity requires a shared reader for the observed separate-caption/two-column blocks, including plural ALIASES and wrapped current/previous addresses. Its validation predicates remain separate from assessment-jurisdiction selection. Keep each address's components together and preserve valid interstate address history.

Diagnosis used actual live extraction records and source modules whose hashes match the active shipped release. It found extraction gaps and absent or narrow predicates; it did not prove a general certainty gate rejected already valid candidates. All proposed acceptance controls below are **not run**. Every TODO has implementation **NOT STARTED**, staging **NOT RUN**, and production fix verification **NOT RUN**.

### FIX-TODO-001 — paid-collection verification

Evidence: page 1, Collections, both reports show Open and AUD 1,860 Balance beside a consumer statement that payment occurred before the latest report. Finding IDs `AI-AU-001-01`, `AI-AU-002-01`; internal confidence **potential**.

Confirmed first blocker: no typed collection status/balance or complete attributed paid statement. The remark survives only partly in raw text. The next blocker is a paid-status predicate that cannot assess a paid claim alongside Open. Required correction: retain both source statements, join them to the same collection and add a governed factual verification branch. Preserve the distinction between a consumer claim, cleared payment and a historical default amount. [OAIC paid-default guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/repayment-history-and-defaults) supports updating a paid default's status while retaining applicable history.

Acceptance: both originals produce one selectable, source-linked verification issue each. A retained historical amount on an explicitly Paid default, partial payment, unrelated remarks and ambiguous account associations do not produce an unsupported unpaid-status finding.

### FIX-TODO-002 — old collection verification

Evidence: page 1, Collections, all three reports retain Open collections assigned in 2019, last reported in 2020, with AUD 2,860 Balance. Finding IDs `AI-AU-003-01`, `AI-AU-005-01`, `AI-AU-009-01`; internal confidence **potential**.

Confirmed first blocker: Assigned/Last Reported become anonymous dates; the collection identity, typed status/balance and complete remarks are missing. Some dates remain ambiguous. Records are generic collections, so the statutory default rule exits before comparison, and no separate old-listing verification producer exists. Required correction: preserve labelled dates and their uncertainty, then add bounded factual currency/retention verification. Do not relabel Assigned or Last Reported as first delinquency, last payment or first bureau collection. The statutory five-year default clock starts at bureau collection of default information; the original does not conclusively establish that event/category. [Privacy Act, section 20W](https://www.legislation.gov.au/C2004A03712/2026-06-04/2026-06-04/text/original/epub/OEBPS/document_1/document_1.html).

Acceptance: each original yields one qualified selectable verification issue with its own 2020 date evidence. Preserve alternate valid date interpretations and use a conservative supported age. Recent collections, old assignment dates alone, different information categories and neighboring records do not become definite expired-default findings. Preserve the separate statutory clock when the report actually establishes it.

### FIX-TODO-003 — Open versus closure narrative

Evidence: AU-004 page 1, account summary and the corresponding payment-history/remarks row. The student-loan status is Open while its own remark describes the account as closed. Finding ID `AI-AU-004-01`; **definite printed contradiction**, with actual closure facts requiring verification.

Confirmed first blocker: Open is embedded in reported identity and the closure narrative is not bound to that account. The next predicate requires a numerical closure date. Required correction: compare the two source-owned status statements without fabricating a date; carry the bounded status issue through selection and factual correspondence.

Acceptance: one issue contains both source locations. Zero balance alone, closure text for a different account, an unbound remark or OPEN as a product type do not trigger it.

### FIX-TODO-004 — explicit ownership denial

Evidence: AU-007 page 1, the fifth account and its remarks explicitly state that the account does not belong to the consumer. Finding ID `AI-AU-007-01`; internal confidence **potential**.

Confirmed first blocker: the PERSONAL INFORMATION section does not exit at CREDIT ACCOUNT INFORMATION, and the live extraction yields zero account records. The existing responsibility check also lacks an attributed account-denial branch. Required correction: admit the actual section/header layout, read all five accounts and attach the denial only to its own account. Add bounded ownership-verification coverage to the shared checklist under the October 10 expansion authority and preserve factual packet eligibility. A denial does not establish identity theft.

Acceptance: read five accounts, produce one selectable ownership-verification concern for the denied account, and retain the original statement attribution. Unfamiliar creditor names, aliases alone, generic rights notices and remarks belonging to another account remain controls.

### FIX-TODO-005 — disputed Charge Off status

Evidence: AU-010 page 1, retail-account summary and the corresponding remarks. Charge Off is accompanied by an explicit consumer status dispute; recent history contains undated OK entries. Finding ID `AI-AU-010-01`; internal confidence **potential**.

Confirmed first blocker: Charge Off is untyped. A global dispute marker is detected, but it is observation-only and is not bound to a governed selectable account issue. Required correction: bind status and the attributed dispute, then add a bounded status-verification branch and packet path under the existing checklist/October 10 expansion authority. Undated OK history and a nonzero balance do not independently disprove a charge-off.

Acceptance: the original yields a source-linked selectable status-verification issue. A charge-off with only a remaining balance, undated good history, a generic dispute notice or another account's disputed status does not establish this concern or a definite error.

### FIX-TODO-006 — address geography accuracy

Evidence: page 1 identity blocks in nine reports. Examples include Melbourne with ACT, Darwin with ACT, Perth with NSW, Melbourne with NT, Adelaide with QLD/WA and Sydney with VIC. AU-003/005 also have conflicting previous-address geography. Each address finding is linked to its original review ID in the comparison manifest; internal confidence **probable**.

Confirmed first blocker: all ten live files have empty identity groups because the reader expects same-line colon captions. Later checks lack within-address geography validation, and identity review is excluded from selectable issue projection. Required correction: map separate captions/values and wrapped address fields, compare validated locality/state/postcode combinations using accepted geographic/postal evidence and exceptions, then admit the supported accuracy issue into the shared checklist and issue/packet projection. The consumer-selected assessment jurisdiction stays separate. [Official capital-city geography](https://immi.homeaffairs.gov.au/citizenship/test-and-interview/listen-to-podcast/transcript-episode-2) and source-specific postal references are retained in the private reviews.

Acceptance: one bounded address-accuracy finding per affected report retains each conflicting field together. Correct interstate address history, legitimate postal exceptions, overseas addresses, and differences from selected assessment jurisdiction are not errors solely for those reasons. Never guess a replacement address.

### FIX-TODO-007 — malformed Australian postcode

Evidence: AU-008 page 1, additional previous address, has the six-character value `9TFL4E` while identifying the address as Australian. Finding ID `AI-AU-008-01`; internal confidence **definite displayed format discrepancy**. [Australia Post postcode assignment policy](https://auspost.com.au/about-us/corporate-information/our-organisation/policies/assignment-of-postcodes) describes the four-digit numeric system.

Confirmed first blocker: the address is not extracted into identity facts. Later mechanisms lack a postcode-format predicate and selectable identity projection. Required correction: preserve the original address and validate its declared country/postcode format through a governed shared-checklist check and factual correction request. The intended postcode is unknown; aliases are context, with no separate mixed-file finding.

Acceptance: the six-character value survives extraction and produces one selectable address-format issue with source evidence. Leading-zero Australian postcodes, legitimate foreign formats, missing fields alone and ordinary aliases do not trigger a fabricated identity finding.

### Completion and evidence boundaries

Second-batch extensions: **FIX-TODO-004** also covers AU-012's page-1 fifth account and its explicit attributed denial; that layout yields generic records, so the AU-007 section-exit failure is not assumed for it. **FIX-TODO-005** adds AU-019's page-1 disputed Charge Off. **FIX-TODO-006** adds all ten second-batch address groups, still unextracted into identity facts. **FIX-TODO-007** adds AU-020's page-1 Australian previous-address value `9O8LAF`; its materially different aliases remain context only. All added finding IDs and source references are in the second-batch manifest.

[OAIC correction guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/correct-your-credit-report) supports bounded accuracy/currency verification; evidence and uncertainty govern each request. A source-backed check does not require a separate statute adapter. New supported common errors are admitted through the owner's October 10 checklist expansion, without a new routine permission gate. This review task has not implemented that admission.

Each future fix must connect extraction/check → understandable issue → consumer selection → reviewed/approved eligible packet and include meaningful positive/benign/source-association controls. Bureau forms remain retired. Do not replace existing historical assessments. Schedule implementation only in the single work register when authorized; retain the separate implementation/staging/production statuses above.

Diagnosis evidence: [account/status](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-11-au-turn1/diagnosis-account-status.json), [collections](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-11-au-turn1/diagnosis-stale-collections.json), [identity/address](/C:/Users/webbd/.codex/private/crp-ai-comparison/2026-10-11-au-turn1/diagnosis-identity-address.json). Source provenance and exact blocking locations are included there; proposed acceptance examples are not passing test receipts.

### FIX-TODO-008 — older court-entry verification

Evidence: AU-011 and AU-014, page 1 Public Records, identify Civil Judgment, Filed in 2017, Satisfied, and AUD 1,425 on their 2026 reports. Finding IDs `AI-AU-011-01` and `AI-AU-014-01`; internal confidence **potential**. Their printed filing dates support checking an older retained entry; they do not conclusively establish when judgment was made.

Confirmed first blocker: live record 7 in each report is identified as a general public record, but the table's Filed, Status, Reference and Amount meanings are not mapped. The date receives the row-prose label JUDGMENT rather than Filed; AU-014's numeric date is unresolved. Neither has a canonical judgment-entry date, and retention comparisons are zero. Required correction: add a reusable native public-record table mapping with exact captions, row fences, source locations and AUD semantics, then admit bounded old-entry factual verification through the checklist, selection and existing packet path. Use an established judgment-made/given event for the applicable five-year AU court-information period. [Privacy Act section 20W, item 8](https://www.legislation.gov.au/C2004A03712/2026-06-04/2026-06-04/text/original/epub/OEBPS/document_1/document_1.html).

Keep Filed separate from judgment-made and satisfaction dates. A judgment may have been made after filing, and lawful retention exceptions may apply. Satisfaction alone is not an immediate deletion rule. This task does not assert a definite expired-period breach from these originals.

Acceptance, not run: both originals yield one source-linked selectable old-court-entry verification concern. A separately printed judgment-made date can support the numerical clock. Recent judgments, a later judgment following old filing, missing fields alone, neighboring record dates and ambiguous numeric readings do not become unsupported definite expiry findings. Preserve status/reference/amount and both report/assessment dates in selected factual correspondence.

### FIX-TODO-009 — repeated AU account rows

Evidence: AU-018 page 1 account rows 1 and 5 repeat the creditor, masked account suffix, product, Opened/Closed/Reported values, status, AUD 1,240 balance, AUD 6,500 limit and AUD 45 payment. A repeated corresponding remarks row identifies potential duplicate reporting. Finding ID `AI-AU-018-01`; internal confidence **probable**. Masked-number collisions or legitimately distinct facilities remain possible.

Confirmed first blocker: live records 2 and 5 retain the same identity string, but neither has a separate masked identifier, typed identifying dates or independent amount/limit/status facts. The existing duplicate check requires those corroborations, so the pair never becomes a candidate. Required correction: reuse measured AU account-table extraction and existing duplicate mechanics, retaining both physical rows, their same-report boundary and independent fact provenance. If absolute date normalization remains ambiguous, support a narrowly corroborated comparison of identical source-printed identifying dates/ranges without inventing a numeric convention or weakening identity/third-fact safeguards.

Acceptance, not run: the original produces one qualified selectable duplicate-verification issue with both source-row locations. Preserve both rows until after assessment. Same trailing digits with a different creditor, conflicting independent facts, different snapshots, page continuation, or dates/name/masked number alone remain benign/refusal controls. Carry a verification request into the approved packet flow without declaring certain duplicate debt or legal liability.

Both new TODOs remain implementation **NOT STARTED**, staging **NOT RUN**, and production fix verification **NOT RUN**. No CRP code changes are authorized until the owner instructs running the fix list.

### Third-batch corrective extensions and controls

**FIX-TODO-003:** AU-028 page 1 repeats the supported Open-versus-closed narrative conflict. Reuse typed status, wrapped remarks and source association; no closure date is invented.

**FIX-TODO-005:** AU-030 page 1 reports Harbour Auto Finance as 60 Days Late while its own remark says it was previously past due and the consumer disputes it after resolution. The live record retains 60 DAYS LATE only inside reported identity, without typed account status or the bound full remark. Extend the already-required attributed status-verification branch beyond Charge Off. Keep this **potential**: neither the undated history direction nor the date/effect of resolution is proved, and the printed balance is not labelled past due. This does not restore a late-payment question flow or claim that legitimate historical lateness must be erased. Acceptance, not run: one source-linked verification issue with current status and complete remark; ordinary past late payments, ambiguous history chronology, another account's remark and balance alone remain controls.

**FIX-TODO-006:** all ten third-batch live extractions have empty identity groups despite printed current/previous addresses. Reuse the existing two-column identity/within-address validation correction; keep geography independent of selected assessment region.

**FIX-TODO-008:** AU-027 page 1 adds a Civil Judgment with Filed 26/05/2017, Satisfied and AUD 1,425. Reuse public-record column mapping and qualified old-entry verification; preserve Filed separately from judgment-made. The numerical statutory clock and exceptions remain unchanged.

All acceptance criteria remain proposed, not passing test receipts. Implementation, staging and production fix verification remain pending the owner's instruction to run the fix list. This task changed comparison documentation and private evidence only; CRP product code was not changed.

### Fourth-batch extensions

**FIX-TODO-003:** AU-035's page-1 student account is Open with its own wrapped closure narrative. **FIX-TODO-004:** AU-034's fifth account has an attributed ownership denial. **FIX-TODO-005:** AU-032 and AU-036 add expressly disputed Charge Off statuses; AU-032 has zero extracted records, while AU-036 retains status inside an identity string. **FIX-TODO-006:** all ten live files have empty identity groups. **FIX-TODO-009:** AU-037 and AU-038 each repeat two physical account rows with creditor/masked ID, identifying dates and matching independent amount/limit/status facts. Reuse the existing corrections and safeguards; no separate defect IDs are created for these instances.

### FIX-TODO-010 — explicit balance dispute

Evidence: AU-033 page 1, first account and its corresponding remarks; finding `AI-AU-033-01`. Balance AUD 7,240, limit AUD 6,500, status Current; the report explicitly attributes a balance dispute to the consumer. Internal confidence **potential**. The correct balance is unknown. An over-limit balance can be legitimate and is not the finding predicate. [OAIC correction guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/correct-your-credit-report) supports accuracy verification.

Confirmed first blocker: live record 2 embeds the printed amounts in `account.reported_identity`, with no typed balance/credit-limit/currency or bound balance-dispute remark. Matching shipped source's balance-consistency check compares past-due amount against balance, and its revolving check compares positive balance against an explicit zero limit; neither covers this attributed balance dispute. Required correction: reuse the AU account/remarks mapping, preserve exact AUD values and bind the explicit claim to its own account. Add a bounded balance-verification branch to the shared checklist and selectable issue/approved packet path. Do not calculate or invent a replacement amount.

Acceptance, not run: one qualified balance-verification issue includes account-row and attributed-remark evidence. An over-limit balance without a dispute, fees/interest, another account's dispute, generic notices or payment exceeding balance remain controls. Do not call the printed amount definitely wrong or treat it as past due.

### FIX-TODO-011 — inquiry authorization/permitted-purpose verification

Evidence: AU-039 page 1, third inquiry: Hard, Credit application, date 30/05/2026, with **Authorized No** in its own column. Finding `AI-AU-039-01`; internal confidence **potential**. This affirmative printed value differs from an absent column or Authorization not verified, but does not establish unlawful access, a denied credit application, or identity theft. [OAIC information guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/information-on-your-credit-report) states that consumer-credit application access does not require consent and has notification requirements; [permitted-access guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/third-party-access-to-credit-reports) scopes recipients and purposes. The basis and meaning of this report-owned No should be verified, not presumed illegal.

Confirmed first blocker: this inquiry is not a separate typed inquiry record. Its date survives as APPLICATION inside live GENERAL_ACCOUNT record 7, anchored to a different subscriber's first inquiry. Subscriber/type/purpose/Authorized No are not preserved as the target's bound facts. The inspected general inquiry path maps a date, and the inspected shared-checklist producer has no branch for this attributed authorization signal. Required correction: admit and fence the actual inquiry table, preserve each subscriber/date/type/purpose/authorization value and source location, then add a qualified permitted-purpose/accuracy-verification branch and consumer-selected factual packet. Do not merge inquiries or equate missing consent with unlawful access.

Acceptance, not run: this original yields one qualified verification concern containing the actual target row. Authorized Yes, absent authorization, not verified, unfamiliar name alone and lawful access without consent do not become automatic violations. Establishing a lawful purpose resolves the access concern; preserve source-owned uncertainty and notification semantics. No definite access-law breach is asserted from this sample.

Both new TODOs and all extensions remain implementation **NOT STARTED**, staging **NOT RUN**, production fix verification **NOT RUN**. Inspected local general-intake, common-errors, common-error-rule-assessment and issues modules match the active production hashes. Acceptance examples are proposed, not passing receipts. No CRP product code was changed.

### Fifth-batch corrective extensions

**FIX-TODO-004:** AU-048's page-1 fifth account and wrapped remark explicitly attribute an ownership denial. **FIX-TODO-006:** all ten files print within-address geography concerns but have empty live identity groups. **FIX-TODO-007:** AU-041 and AU-045 add the Australian previous-address values `1DQXJK` and `YXKTRG`. [Australia Post](https://auspost.com.au/about-us/corporate-information/our-organisation/policies/assignment-of-postcodes) confirms the four-digit numeric system; preserve the wrapped original address and leading-zero/foreign-format controls. **FIX-TODO-009:** AU-046 repeats the first/fifth account rows with the same creditor/masked ID, dates, status, balance, limit and payment, plus its own potential-duplicate remark. **FIX-TODO-010:** AU-050 adds an explicit first-account balance dispute; balance exceeding limit alone remains a nonfinding. [OAIC correction guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/correct-your-credit-report) supports bounded accuracy verification.

Actual new live records confirm the same extraction dependencies: empty identity groups and absence of separately typed masked identifier/status/balance/limit with full attributed remarks. Required corrections reuse the existing mappings, row/remark association and governed factual verification/packet branches. Do not relax duplicate corroboration or infer ownership/amount errors from names or numeric amounts alone. Four inspected local source modules match active production hashes. Implementation **NOT STARTED**, staging **NOT RUN**, production fix verification **NOT RUN**; proposed acceptance controls remain unrun.

### Sixth-batch corrective extensions

**FIX-TODO-001:** AU-059 page 1 explicitly attributes payment before the latest report to the consumer while the collection is Open with Balance AUD 1,860. Preserve the claim, typed balance/status and source date meanings; do not assert cleared payment or substitute a historical amount for balance. **FIX-TODO-005:** AU-051 adds an expressly disputed Charge Off. **FIX-TODO-006:** all ten actual files still have empty identity groups. **FIX-TODO-008:** AU-057 adds a 2017 Filed Civil Judgment, Satisfied, AUD 1,425. [OAIC retention guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/what-stays-on-a-credit-report) lists a five-year court-judgment period; filing remains distinct from judgment-made/given. **FIX-TODO-009:** AU-056 repeats the first/fifth account with creditor/masked ID, identifying dates, status and independent typed amount/limit facts requiring the existing guarded pairing.

**FIX-TODO-003:** AU-054/058 have stronger source evidence than narrative-only cases: each explicitly prints Closed 24/12/2025 beside Open status on the 22/06/2026 reported row and its own closure remark. Count one underlying contradiction per report. The existing `accountStatusDateContradiction` in matching shipped `common-errors.cjs` already handles OPEN/ACTIVE with a typed `liability.closedDate`; reuse it when these original fields are extracted. No new date predicate is needed for these two reports. AU-058 has zero extracted records, while AU-054's wrapped student row is merged into a neighboring generic account and the Closed date loses its caption. Preserve exact row fences/status/date meanings, then feed the existing check. Keep the earlier narrative-without-date branch needed by AU-004/028/035. Acceptance, not run: one selectable issue per report carries its printed status/date/narrative; explicit N/A/absence, another account's date, product-type OPEN, future/ambiguous dates and zero balance alone remain controls.

All corrections remain implementation **NOT STARTED**, staging **NOT RUN**, production fix verification **NOT RUN**. Four inspected source modules match active release hashes. No product code changed; acceptance examples remain proposed.

### Seventh-batch corrective extensions

**FIX-TODO-007 / AU-062 / AI-AU-062-01** — Page 1 additional Australian previous address Unverified City, AU 9TFL4E, Australia. Internal confidence **definite**. Six-character alphanumeric postcode discrepancy; intended value unknown. Aliases alone do not establish mixed identity. Required correction: Reuse faithful wrapped-address extraction and country-scoped postcode format verification with packet.

**FIX-TODO-002 / AU-064 / AI-AU-064-01** — Page 1 collection Clearpath Recoveries Australia ****6163, Assigned 30/01/2019, Last Reported 13/06/2020, Open, Balance AUD 2,860; own remark Stale collection remains on file, included on 22/06/2026 report. Internal confidence **potential**. Assigned and Last Reported are not first delinquency, last payment or first bureau collection. Qualifies for factual currency/retention verification, not definite statutory expiry. Required correction: Map labelled collection dates/status/balance/complete remarks and qualified old-listing verification without inventing a clock start.

**FIX-TODO-003 / AU-065 / AI-AU-065-01** — Page 1 Southern Education Loan ****4925 Closed 24/12/2025, Reported 22/06/2026, Open, zero balance; own remark Closed account reporting as open. Internal confidence **definite**. Printed status/date/narrative conflict; actual closure requires verification. Required correction: Map exact Closed date and typed Open status, reuse existing status/date check, preserve bound narrative and one issue for one contradiction.

**FIX-TODO-005 / AU-066 / AI-AU-066-01** — Page 1 Harbor Retail Services ****7022 Charge Off, AUD 320; own remark Consumer disputes account status. Internal confidence **potential**. Undated OK cells and remaining balance do not independently refute charge-off. Required correction: Reuse typed current status and source-owned attributed dispute verification/packet branch.

**FIX-TODO-001 / AU-067 / AI-AU-067-01** — Page 1 collection Clearpath Recoveries Australia ****6163, Assigned 16/02/2026, Last Reported 11/06/2026, Open, Balance AUD 1,860; own remark Consumer states collection was paid before latest report. Internal confidence **potential**. Claim does not establish cleared payment; balance and historical default amount remain distinct. Required correction: Reuse typed collection fields and complete bound paid claim; qualified factual verification and packet.

**FIX-TODO-008 / AU-068 / AI-AU-068-01** — Page 1 public record Civil Judgment, Filed 09/06/2017, Satisfied, AUD 1,425, included on 22/06/2026 report. Internal confidence **potential**. Filed is not judgment-made/given; later judgment or lawful retention exception remains possible. No definite expiry. Required correction: Reuse public-record table mapping and qualified old-entry verification with preserved event meanings.

**FIX-TODO-002 / AU-069 / AI-AU-069-01** — Page 1 collection Clearpath Recoveries Australia ****6163, Assigned 30/01/2019, Last Reported 13/06/2020, Open, Balance AUD 2,860; own remark Stale collection remains on file, included on 22/06/2026 report. Internal confidence **potential**. Assigned and Last Reported are not first delinquency, last payment or first bureau collection. Qualifies for factual currency/retention verification, not definite statutory expiry. Required correction: Map labelled collection dates/status/balance/complete remarks and qualified old-listing verification without inventing a clock start.

**FIX-TODO-011 / AU-070 / AI-AU-070-01** — Page 1 third inquiry Unrecognized Credit Application, 31/05/2026, Hard, Credit application, Authorized No. Internal confidence **potential**. Affirmative No warrants verification but consent is not universally required for consumer-credit application access; actual permitted purpose/notification facts unknown. Required correction: Fence inquiry rows and preserve subscriber/date/type/purpose/authorization; reuse qualified permitted-purpose/accuracy verification and factual packet.

All ten actual live identity groups remain empty. The new actual extracts confirm section/table and row/remark association gaps; typed target fields remain absent rather than an already-valid candidate being suppressed by certainty. AU-064/067 use the Equifax section-exit layout, so zero records is a first blocker. Other layouts retain generic records with anonymous dates, untyped status/balance and unbound remarks. Reuse the previously recorded shared mappings, predicates and consumer-selected packet flow. Preserve the separate Assigned/Last Reported, first-delinquency/last-payment, first-bureau-collection and judgment-made/given meanings. No definite statutory expiry is asserted. Reuse the existing Open/Closed-date predicate for AU-065 when its fields are correctly extracted.

[OAIC access guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/information-on-your-credit-report) confirms consumer-credit application access does not universally require consent; verify actual permitted purpose and notification instead of automatically treating Authorized No as unlawful. [OAIC correction guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/correct-your-credit-report) supports qualified currency/accuracy requests. Existing positive/benign/source-association acceptance controls remain applicable and **not run**. Four inspected source modules match active release hashes. All TODOs remain implementation **NOT STARTED**, staging **NOT RUN**, production fix verification **NOT RUN**; no CRP product code changed.

### Eighth-batch corrective extensions

**FIX-TODO-002 / AU-071 / AI-AU-071-01** — Page 1 Clearpath Recoveries Australia ****6163, Assigned 30/01/2019, Last Reported 13/06/2020, Open, Balance AUD 2,860; own remark Stale collection remains on file; included on 22/06/2026 report. Internal confidence **potential**. Assigned/Last Reported are not first delinquency, last payment or first bureau collection; qualified verification, not definite statutory expiry. Required correction: Reuse labelled collection dates, status/balance, complete remarks and qualified currency/retention verification.

**FIX-TODO-010 / AU-079 / AI-AU-079-01** — Page 1 Pioneer Bankcard ****2864 Current, balance AUD 7,240, limit AUD 6,500; own remark Balance amount disputed by consumer. Internal confidence **potential**. Over-limit balance alone is not erroneous; actual correct amount unknown. Required correction: Reuse typed AUD balance/limit and attributed account-bound dispute; selectable balance verification/packet.

**FIX-TODO-011 / AU-080 / AI-AU-080-01** — Page 1 third inquiry Unrecognized Credit Application, 15/06/2026, Hard, Credit application, Authorized No. Internal confidence **potential**. Explicit No supports verification but consumer-credit application access does not universally require consent; lawful purpose and notification remain unestablished. Required correction: Fence and preserve inquiry subscriber/date/type/purpose/authorization; reuse qualified permitted-purpose/accuracy verification and packet.

All ten live identity groups are empty despite printed current/previous address components; reuse two-column identity mapping, within-address validation and eligible issue/packet projection for **FIX-TODO-006**. AU-071 retains a generic collection without the labelled typed fields/complete bound remarks needed for currency verification. AU-079 has zero extracted records under the already-recorded Equifax section-exit gap. AU-080's target inquiry lacks a separately fenced typed record with its authorization value. Reuse existing shared mappings and attributed verification branches; no new parser per sample or weakened evidence safeguards are required. [OAIC access guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/information-on-your-credit-report) distinguishes consent from permitted consumer-credit application access and notification. Keep unknown authorization and lawful no-consent access as controls; do not assert definite unlawful access from this source value.

Four inspected modules match active production hashes. All TODOs remain implementation **NOT STARTED**, staging **NOT RUN**, production fix verification **NOT RUN**. Proposed acceptance controls remain unrun. This task changed the comparison register and private evidence only.

### Ninth-batch corrective extensions

**FIX-TODO-001 / AU-084 / AI-AU-084-01** — Page 1 collection Clearpath Recoveries Australia ****6721, Assigned 30/01/2026, Last Reported 25/05/2026, Open, Balance AUD 1,860; own remark Consumer states collection was paid before latest report. Internal confidence **potential**. Attributed claim is not proof cleared payment; balance and historical amount remain distinct. Required correction: Reuse typed collection fields, complete bound paid claim and selectable factual verification/packet.

**FIX-TODO-007 / AU-085 / AI-AU-085-01** — Page 1 additional Australian previous address Unverified City, AU 9TFL4E, Australia. Internal confidence **definite**. Six-character alphanumeric format discrepancy; intended postcode unknown. Aliases alone do not prove mixed identity. Required correction: Reuse faithful wrapped-address extraction and country-scoped four-digit numeric postcode validation with factual packet.

**FIX-TODO-001 / AU-087 / AI-AU-087-01** — Page 1 collection Clearpath Recoveries Australia ****6163, Assigned 16/02/2026, Last Reported 11/06/2026, Open, Balance AUD 1,860; own remark Consumer states collection was paid before latest report. Internal confidence **potential**. Claim is not cleared-payment proof; preserve exact date/amount semantics and uncertainty. Required correction: Reuse typed collection fields, complete bound paid statement and qualified factual verification/packet.

**FIX-TODO-009 / AU-088 / AI-AU-088-01** — Page 1 rows 1 and 5 repeat Pioneer Bankcard ****2864, Credit Card, Opened 09/10/2023, Closed N/A, Reported 22/06/2026, Current, AUD 1,240 balance, AUD 6,500 limit and AUD 45 payment; repeated own remark Potential duplicate reporting. Internal confidence **probable**. Distinct facilities or masked collisions remain possible; no invented numeric date convention. Required correction: Reuse guarded same-report duplicate pairing, both physical row locations, identifying date and independent typed corroborations.

**FIX-TODO-006:** AU-081–088 add eight printed within-address geography concerns. The actual live identity groups remain empty; reuse caption/value mapping and address-specific validation with postal exceptions and eligible factual packets. Sparse AU-089/090 have no address evidence, so they add no address TODO. AU-085/088 have zero live extracted records under the Equifax section-exit gap; the other affected layouts retain generic collection/account records without their full typed fields and attributed remarks. Preserve both physical duplicate rows and guarded pairing. Reuse existing paid-claim, postcode and duplicate verification corrections; no new parser per sample or weakened confidence safeguards. [OAIC paid-default guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/repayment-history-and-defaults) supports status updates after established payment while preserving applicable history. [Australia Post](https://auspost.com.au/about-us/corporate-information/our-organisation/policies/assignment-of-postcodes) supports four-digit numeric format; no intended replacement is guessed.

Four inspected source modules match active production hashes. All TODOs remain implementation **NOT STARTED**, staging **NOT RUN**, production fix verification **NOT RUN**. Proposed acceptance controls remain unrun. No CRP product code changed.

### FIX-TODO-012 — source report-date chronology verification

Evidence: AU-096–099 page 1 **Report Date 10/01/2026**, both account **Last Updated 22/06/2026**, first Last Payment Date 10/06/2026; page 2 enquiry Date 14/06/2026. Other printed dates include Opened 15/03/2022 and Closed 15/12/2025. Finding IDs are in the manifest; internal confidence **potential**. The day/month reading gives January 10, before June updates; a month/day reading gives October 1 and can resolve the update chronology. The source context supports day/month but does not explicitly declare its convention. Each date keeps its own meaning and uncertainty; do not force a convention from country, another field or a filename.

Confirmed first blocker: all four actual live reference dates have raw/null and reason `NO_REPORT_DATE_FOUND`, despite the printed header. Account `reportedAccount.reportedDate` is correctly resolved as 2026-06-22. The inspected `findReferenceDate` admits only normalized date candidates and drops the ambiguous header rather than retaining its raw text/source and alternatives. Consequently the existing `entryReportedAfterReportDate` has no report reference to compare. The enquiry date is also split from its named inquiry, so it is corroborating original evidence, not a trusted substitute clock.

Required correction: retain explicit source-owned report headers, including unresolved readings and location; preserve possible January 10/October 1 readings independently of the upload/assessment date. Reuse the existing chronology predicate where source convention is established, and add a narrowly qualified chronology-verification branch where the concrete header/update pattern remains materially uncertain. Keep the report-date concern as one underlying issue per report, rather than one per account/date. Carry original evidence, honest alternatives and a request to verify issue/update dates into selection and the reviewed packet. This is not an unresolved-value card or a fabricated definite violation. [OAIC accuracy guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/correct-your-credit-report) supports the bounded verification request.

Acceptance, not run: four originals yield qualified source-linked chronology concerns without a guessed normalized report date. The definite predicate requires established event/convention evidence. June report dates with June updates, older updates, actual later snapshots, missing header alone, another report's date and viable alternative convention must not become definite future-reporting findings. Preserve raw/alternative header readings; never replace them with assessment date.

### FIX-TODO-013 — Paid status with positive AUD balance

Evidence: AU-097/098 page 1, first credit-card account: **Status Paid, Balance AUD 250, Credit Limit AUD 6,500**. IDs `AI-AU-097-01`, `AI-AU-098-01`; internal confidence **probable**. The correct amount and cleared payment are unknown; verify whether the balance is current or historical and what the status describes. No replacement amount, financial loss or legal liability is asserted.

Confirmed first blocker: first live account retains `account.status=PAID`, separate masked ID, type and labelled date. The explicit `account.balance` raw value AUD 250 survives with **UNRECOGNIZED_AMOUNT_VALUE**, no normalized numeric balance; limit/payment values also fail. `labeledAmounts` delegates to `printedAmount` but does not admit this printed AUD prefix. The existing `paidOrSettledShownUnpaid` already handles typed PAID with positive balance; the missing amount prevents applicability. This is a different evidence predicate from consumer-claimed payment against an Open collection (FIX-TODO-001) or explicitly disputed balance (FIX-TODO-010), although normalization is reusable.

Required correction: recognize explicit supported AUD amount tokens while preserving raw value, source label, currency, account and trust; keep balance/limit/payment separate and explicit Not reported nonnumeric. Reuse the existing paid-status/balance check and issue/selected-packet path. No new paid-status engine, inferred amount or report-date gate is needed for this independent factual check.

Acceptance, not run: both originals yield one bounded selectable Paid/positive-balance concern with its own account evidence. Open positive balance, Paid zero balance, nonzero historical amount with a distinct meaning, partial settlement, missing/Not reported values, another account's amount and scheduled payment alone remain controls. Format variants require measured positive/benign tests; do not silently relabel AUD as USD.

Both new TODOs remain implementation **NOT STARTED**, staging **NOT RUN**, production fix verification **NOT RUN**. Four inspected source modules match active production hashes. Proposed acceptance criteria are unrun; no CRP product code changed.

### Final-batch existing TODO extensions and shared first blockers

**FIX-TODO-003:** AU-101 adds Open beside Closed 04 Dec 2024 in the same personal-loan block; AU-104 adds Open beside an explicit 10/02/2025 closure and its attributed dispute. **FIX-TODO-001:** AU-104 adds an Unpaid default against its own paid-in-full note/date; retain historical amount separately from current status. **FIX-TODO-005:** AU-104 explicitly disputes dated Jan 2025 RHI after a November 2023 sale; broaden the existing attributed adverse-status-verification branch to its source-owned monthly rating. Sale does not extinguish debt or disprove lateness. **FIX-TODO-011:** AU-104 adds an explicit no-credit-application/soft-quote statement for QuickCart; do not manufacture a Hard label or make consent universally mandatory.

Required shared admission correction for AU-101/102/103: recognize these actual unbranded AU disclosure structures from their credit-account/default/RHI/enquiry content and country evidence, retaining the chosen test bureau separately from true source issuer. Preserve genuine unrelated-document refusal; do not whitelist filenames, add fake bureau branding, or require a historical profile/specimen certification for general intake. Carry native table rows, text-month headers, source-owned identifiers and negative/no-entry captions into the existing mechanisms. This is the first correction needed under the linked TODOs, not evidence any substantive predicate was run.

AU-104 requires measured row/column fences and source-statement association: raw default notes are split into repeated generic records, typed status/amount and account identifiers are missing, and the purchaser/enquiry rows are not faithfully represented. Its report date is falsely conflicted with the birth date printed in the neighboring identity column. Reuse the report-header/source-location correction in **FIX-TODO-012** as a dependency, keeping DOB separate; this processing gap adds no independent report-error instance. Preserve the document's explicit DD/MM/YYYY data convention, and deduplicate repeated narrative statements instead of creating extra account entries.

**FIX-TODO-015 / AU-101 / AI-AU-101-02** — CityTel reference ending 2770 Defaults row: Default date 18 Jan 2020, Default amount $132, Unpaid, last updated 31 May 2026. Internal confidence **probable**. Consumer-credit default threshold is at least $150; verify original overdue total/category and whether $132 is a changed remaining amount. Not a definite unlawful listing. Notices and 60-day facts are not established. Required correction: Preserve original default amount versus current balance/category, add bounded minimum-default-amount check and verification packet.

**FIX-TODO-014 / AU-101 / AI-AU-101-03** — CityTel reference ending 2770 default date 18 Jan 2020, default amount $132, Unpaid, last updated 31 May 2026; included on 12 Jun 2026 report. Internal confidence **potential**. Default date is not automatically first CRB collection. Five-year category period needs its correct start; latest update or paid date does not reset it. Exceptions may apply. Required correction: Map native default table, exact date/category and amount/status; qualified old-default review with correct collection-date clock when established.

**FIX-TODO-014 / AU-101 / AI-AU-101-04** — Waratah Bank reference ending 2198 default date 12 Mar 2019, default amount $640, Paid, last updated 31 May 2026; included on 12 Jun 2026 report. Internal confidence **potential**. Default date is not automatically first CRB collection. Five-year category period needs its correct start; latest update or paid date does not reset it. Exceptions may apply. Required correction: Map native default table, exact date/category and amount/status; qualified old-default review with correct collection-date clock when established.

**FIX-TODO-014 / AU-101 / AI-AU-101-05** — Southern Cross Finance Personal loan enquiry 12 Mar 2019, amount requested $18,000, Applicant, included on 12 Jun 2026 report. Internal confidence **probable**. Printed enquiry date precedes report by over seven years against five-year information-request period; verify event meaning, pending correction/dispute and lawful retention exceptions. Required correction: Preserve request date and enquiry row; reuse AU five-year information-request clock and qualified eligible packet.

**FIX-TODO-014 / AU-101 / AI-AU-101-06** — Waratah Bank reference ending 2198 hardship table: A temporary arrangement, Months displayed Mar 2024-Apr 2024; page 1 grid also displays A in Aug 2024/Sep 2024; report 12 Jun 2026. Internal confidence **probable**. Both representations are older than one year even with month-level end dates; verify exact payment due dates and retention exceptions. Do not reset from Last updated May 2026. Required correction: Map hardship category/months separately from RHI; preserve month precision and one-year monthly-payment clock with correct exceptions.

**FIX-TODO-014 / AU-101 / AI-AU-101-07** — Three account grids print Jun 2024-May 2026 monthly repayment-history cells; earliest June-August 2024 information remains in this June 2026 snapshot, assessed 12 Oct 2026. Internal confidence **potential**. Two-year RHI periods for June-August 2024 payments have now ended even at latest month bounds plus one-month destruction window. Snapshot does not show current file; no historical June-report violation asserted from current expiry. Required correction: Read source-bound month/year grids; reuse dual report/assessment date current-review mechanism without inventing payment due day or claiming current retention.

**FIX-TODO-016 / AU-101 / AI-AU-101-08** — Same Waratah account: page 1 repayment grid A at Aug 2024/Sep 2024; page 2 hardship summary A temporary arrangement Mar 2024-Apr 2024. Internal confidence **potential**. Multiple arrangements or incomplete summary could explain different periods. Verify association; no invented arrangement dates. Required correction: Preserve dated A cells and same-account hardship period range; compare source representations and add qualified association-verification packet.

**FIX-TODO-018 / AU-101 / AI-AU-101-09** — Waratah reference ending 2198: page 1 Opened 15 May 2020; page 2 Defaults same account default date 12 Mar 2019. Internal confidence **probable**. Reissued/refinanced facility or a changed opening-date meaning may explain it; printed event order warrants verification, not certain wrong debt. Required correction: Link exact account across sections and compare source event meanings; bounded opening/default chronology check with both locations.

**FIX-TODO-014 / AU-102 / AI-AU-102-01** — Three account grids Jun 2024-May 2026; June-August 2024 information on 12 Jun 2026 snapshot, assessed 12 Oct 2026. Internal confidence **potential**. Two-year RHI periods have now ended for earliest months, including one-month destruction window, but current file not supplied. No historical June-report breach asserted. Required correction: Reuse month-level dated-grid mapping and dual-date current-review mechanism, retaining favorable information and exact account association.

**FIX-TODO-014 / AU-103 / AI-AU-103-01** — Hunter Bank credit enquiry 12/02/2021 on report dated 2026-06-04; same date shown as account opening. Internal confidence **potential**. Day/month reading gives 12 February 2021, over five years before report; month/day gives December 2, still within period. No explicit convention declaration; preserve alternatives, exceptions and true request-date meaning. Required correction: Map enquiry table and retain ambiguous raw date/possible readings; qualified five-year verification, no forced convention or definite expiry.

**FIX-TODO-017 / AU-104 / AI-AU-104-04** — Harbour Recoveries reference ending 1188 Open collection AUD 4,410 linked to original Bondi reference ending 1188 Closed/sold AUD 0; consumer explicitly disputes apparent duplicate locator. Internal confidence **potential**. Both lines may legitimately show transfer; zero original balance refutes automatic double-current-balance inference. Explicit attributed concern warrants verifying relationship/reporting, not declaring duplicate debt. Required correction: Preserve distinct original/purchaser roles and same-source locator relationship; bounded claimed-duplication verification branch, separate from strict same-creditor duplicate matching.

### FIX-TODO-014 — category-specific AU retention and current review

Seven concerns use one shared extraction/clock family: two old defaults, two older enquiries (one ambiguous), one older hardship category and two current-file RHI reviews. Reuse accepted AU enquiry/default/liability adapters and dual report/assessment-date review; extend the common-error mapping for supported RHI/hardship category checks where needed. Preserve the numerical periods: enquiry/default five years, RHI two years, hardship one year. Do not apply a universal period, reset from latest update/payment, exclude favorable RHI, or call a current-file review a historical breach. Default date is not automatically first CRB collection; exact source event meanings govern. For month-level data use ranges and conservative bounds. Account/event/category/source association, pending correction/dispute, legal retention exceptions and the statutory one-month destruction window remain explicit.

Acceptance, not run: admit the three refused originals, read the actual dated tables/grids and produce seven bounded concerns with correct event/period/report/assessment evidence. Recent entries, viable alternative numeric dates, wrong category or neighboring account, a current file showing removal, and established retention exceptions remain controls. Do not assert today's file contents from the June PDF. Carry eligible consumer-selected factual correction/current-verification packets.

### FIX-TODO-015 — subminimum default amount

Admission and default-table extraction are first blockers. Add bounded verification against the AU consumer-credit minimum of $150 using the original overdue/default amount and true category. Do not infer notices or 60-day delinquency from missing fields, conflate a remaining balance with the originally listed amount, or apply consumer-default requirements to a different information category. Acceptance, not run: the $132 Default amount yields one qualified concern; current residual $132 from an originally eligible larger default, different category, amounts at/above $150 and missing amount alone are controls.

### FIX-TODO-016 — hardship period association

Admission and source-bound dated-grid extraction are first blockers. Preserve the Waratah account's Aug/Sep 2024 A cells and separate Mar/Apr 2024 summary, compare the linked representations and request verification. Multiple arrangements or distinct account/date roles can explain the difference. Acceptance, not run: one qualified period-association issue contains both locations; different arrangements, matching periods, a shifted/unreadable grid or another account's A cells do not create a definite contradiction.

### FIX-TODO-017 — attributed purchaser/original duplication concern

AU-104's actual purchaser relationship and own dispute are not mapped to a selectable issue. Add a narrowly attributed verification branch with exact original/purchaser link and distinct current balances. This does **not** weaken FIX-TODO-009's strict same-creditor duplicate pairing or the existing double-current-balance check. Acceptance, not run: one qualified reporting/relationship verification request retains the claim and original-zero/purchaser-positive alternative; legitimate transfer without a dispute, locator/name similarity alone and ordinary collection/original lines are controls. No duplicate debt, invalid sale or extinguished liability is asserted.

### FIX-TODO-018 — default predates same account's opening

Admission and exact account association across account/default tables are first blockers. Preserve Waratah's Opened 15 May 2020 and Default date 12 Mar 2019 under the same WB locator, then add bounded event-order verification. Reissued/refinanced facilities and a changed opening-date meaning remain alternatives. Acceptance, not run: one concern has both source sections and exact locator; unrelated default, different account, replacement facility, ambiguous date, generic lender name alone and valid earlier opening are controls. Reuse existing chronology mechanisms without relabelling default as first delinquency.

[Privacy Act sections 6Q, 20V and 20W](https://www.legislation.gov.au/C2004A03712/2026-06-04/2026-06-04/text/original/epub/OEBPS/document_1/document_1.html) support the category clocks, minimum amount and retention safeguards. [OAIC hardship guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/hardship-assistance/what-is-financial-hardship-information) explains A/V markers. The owner's reporting-period directive preserves first-delinquency/last-payment hierarchy for applicable delinquency-based calculations and independent source-supported event/category clocks. No source-field substitution or universal date gate is authorized. Each added common error must reach understandable consumer selection and the reviewed eligible packet when implemented.

Historical comparison closure: all eighteen TODOs were OPEN and implementation had not started when the original comparison was frozen. The October 12 local implementation update below supersedes that implementation status. Historical production responses remain unchanged.

## October 12 authorized local implementation — bounded batch 1

Implementation checkout: isolated branch `codex/au-comparison-fixes-20261012`, based on completed concern/reassessment dependency `1ade2229aabc9ac08e62cdf4a8ed258a1b52c2a2`. The dirty primary checkout and other candidate worktrees were not used as mutable implementation checkouts. All eighteen TODOs remain **OPEN**. Staging verification **NOT RUN**; production fix verification **NOT RUN**.

Private evidence directory: `C:\Users\webbd\.codex\private\crp-ai-comparison\implementation-2026-10-12`. `frozen-corpus-integrity.json` verifies the SHA-256 identity of all 104 originals and preserves the 151-page, 161-concern confidence inventory. `candidate-turn-1-provenance.json` records the exact executable hashes used for the first ten cycles; subsequent repairs have different bytes. `turn-1-cycle-ledger.json` enforces the ten-cycle cap. Frozen independent reviews and production results were not replaced.

Ten completed local original-report cycles: AU-003, AU-007, AU-008, AU-011, AU-018, AU-033, AU-097, AU-101, AU-103 and AU-104. All ten were admitted and exercised consumer selection, review, approval and PDF download. Individual results and packet text are private under `candidate-turn-1`. These are early-candidate observations, not acceptance of the repaired source or the remaining 94 originals.

| TODO | Implemented mechanism | First-batch observation and remaining proof |
|---|---|---|
| 001 | Own collection payment statement and bounded verification | AU-104 detected; all linked examples pending. |
| 002 | Collection last-reported date, five-year qualified review | Early AU-011 miss; date mapping repaired; original retest pending. |
| 003 | Structured Open/closed printed contradiction; separate narrative review | AU-101/104 surfaced; dedicated definite printed-discrepancy branch added afterwards; confidence retest pending. |
| 004 | Exact account ownership denial | AU-007 detected; clean ownership controls pass; linked corpus pending. |
| 005 | Source-attributed disputed status | AU-104 detected; factual request preserves uncertainty. |
| 006 | Source-backed capital/state geography; one report issue retains each address | Multiple examples detected; grouped selection and all linked geography examples pending corpus retest. |
| 007 | Source-owned AU postcode format and wrapped address association | Early miss; wrapped address and malformed format repaired; original retest pending. |
| 008 | Own court Filed date with qualified category/date-role review | AU-011 detected; does not substitute Filed for judgment-made date. |
| 009 | Same-source repeated rows with raw date alternatives and independent corroboration | Early miss; pairing repaired; original retest pending. |
| 010 | Exact own-account balance dispute | AU-033 detected; amount roles and factual verification retained. |
| 011 | Own enquiry purpose/authorization statement | AU-104 detected; does not assert a universal consent requirement. |
| 012 | Report-header date alternatives and source update chronology | AU-097 detected; header association/alternative wording strengthened afterwards. |
| 013 | Printed Paid status with own positive balance | AU-097 detected; money formats and nonzero historical/residual roles tested. |
| 014 | Separate default/enquiry/RHI/hardship clocks and current-file review | AU-101/103 detected; ambiguous dates and historical/current-file limits retained. |
| 015 | Original default amount below $150 | AU-101 detected; remaining balance alone cannot establish this concern. |
| 016 | Same-account hardship summary and dated A-cell linkage | AU-101 detected; exact account and date-period alternatives retained. |
| 017 | Attributed original/purchaser dispute and distinct balances | AU-104 detected; original-zero/purchaser-positive remains a legitimate alternative. |
| 018 | Exact-locator opening/default order | AU-101 detected; refinancing/reissued-facility alternatives remain qualified. |

Shared implementation evidence: `au-disclosure-fields.cjs`, `general-intake.cjs` and existing `account-summary-table.cjs` preserve source geometry, labelled dates and typed record associations. `au-comparison-concerns.cjs`, `report-concerns.cjs`, the active checklist and capability metadata connect governed concerns to existing issue selection and form-free packets. `consumer-dispute-letter.cjs` retains material uncertainty in factual requests. Private matching tokens are excluded from public cards/letters. Report-owned instructions and sample names do not authorize findings.

Meaningful tests are in sections `fn-au-comparison-fixes` (typed facts and benign/conflicting/untrusted controls) and `fo-au-comparison-delivery` (fictional positioned PDF through actual local HTTP selection, approval and downloaded PDF; foreign ownership and stale approval refusal). Existing reader, concern, reassessment, custody, privacy and delivery sections are retained. Focused receipts, including failed attempts, are preserved privately. The broader focused receipt `focused-final-turn1.json` passed 2,357 checks, zero failures/skips on its recorded source snapshot; later repairs require their separate receipts. Full regression remains required and pending.

Remaining acceptance: compare the other 94 originals in batches of at most ten per turn; retest earlier misses and changed confidence/grouping against final source; produce a source-associated concern/confidence/selection/packet matrix for every linked example and clean control; review unexpected findings and remaining misses honestly. AU-100's NOT_DETECTED chronology observation remains a nonfinding. No TODO is closed from counts or predicate-only tests. Full frozen-source regression, separately authorized hosted verification, exact-build release safeguards and owner deployment authorization remain distinct requirements.

Local release plan: repair and freeze executable bytes, complete corpus validation, generate the tracked change-aware plan against the accepted shipped source, run its required full regression, then prepare committed-source packaging/rollback instructions for review. Do not activate staging or production, run provider purchases or send packets. The inherited dependency's hosted evidence does not verify this candidate.

Batch 1 executable manifest: `4C5E4CC72AFC76CC435711817974B00B429E0429ECCCE56CACA8E7DEF60F536D` (local candidate `crp-v1-4c5e4cc72afc76cc`, not hosted). The tracked release planner classified the composite change as FULL and requires full regression, hosted journeys and billing-journey verification. These requirements are not an authorization to deploy or purchase. Its extracted baseline is the receipt inside the accepted news-release review wrapper; it retains the original 14,966/0/0 scope, not current-candidate proof.

The last focused delivery receipt passed 247/0/0. Source review then found RHI grouping could span different source files; the initial full run was interrupted before changing source and is recorded in `interrupted-full-turn1.json` as NOT PASSING. Grouping now uses exact report identity; `report-grouping-turn1.json` passes 62/0/0 with same-report grouping and separate-file eligibility controls. A second interrupted attempt (`interrupted-full-second-turn1.json`) preceded correction of explicit foreign currency being relabelled AUD. `currency-custody-turn1.json` passes 64/0/0, including currency preservation and refusal to apply the AUD minimum to foreign amounts. Foreign currency symbols are also retained and excluded from the AUD minimum. The fictional six-page packet was rendered and inspected: letter, report copy and support copies are legible; an issue heading spans a letter page boundary but no content is lost.

Completed full attempt `full-regression-first-completed-turn1.json`: **14,393 passed / 93 failed / 14 skipped**, no executable source drift. This is NOT PASSING. Failures were missing ignored baseline evidence/HTML and stale checklist count contracts (82 region checks expected 27 rather than 40; capability inventory expected 26 rather than 39 factual checks). Required baseline fixtures were restored without overwriting existing files or copying the original AU corpus. Their hashes are recorded privately. A fresh process then passed every failed section: `full-failure-repairs-turn1.json`, **1,706/0/0**; previously skipped specimen sections pass `restored-specimen-checks-turn1.json`, **1,124/0/0**. Together these 19 focused sections pass **2,830/0/0** on the repaired source. Separate focused receipts do not replace full regression. A final frozen-source full run remains pending after corpus-driven changes are complete.

Mandatory batch review: source geometry/file custody, distinct confidence, report-owned claim attribution, date alternatives, benign purchaser relationships, untrusted/foreign controls and actual form-free consumer selection/approval/download have focused evidence. Scope remains the active checklist and factual verification requests; no independent statutory finding or exhaustive legal-proof gate was introduced. Exact linked-example and clean-control corpus coverage remains incomplete, so the batch is a local implementation checkpoint, not implementation closure or release acceptance. `root-preservation-turn1.json` records all 144 inventoried primary-checkout dirty files unchanged at the preservation check. At batch 1 closure, the next ten-cycle retest was prepared in private `next-bounded-batch.json`, NOT EXECUTED; batch 2 below records its subsequent execution.

## October 12 local retest — bounded batch 2

The owner authorized the prepared ten-report retest with no deployment. All ten cycles completed against committed source `c66a4368a2a15f4d98b4aa284cd9494c3660f25a`, build `crp-v1-4c5e4cc72afc76cc`. All 151 manifest files matched before execution and the recorded executable hashes stayed unchanged through completion. The exact originals and frozen historical reviews/responses were preserved. Evidence: private `turn-2-cycle-ledger.json`, `candidate-turn-2-provenance.json`, `local-account-verification-turn2.json` and `candidate-turn-2/<alias>/`. Fresh isolated local authentication and subscription/historical-access entitlement passed; no production cookies or production account operation were used.

All ten sources were admitted and reached consumer selection, review, approval and actual PDF download. The 28 linked frozen concerns were matched to saved candidate outputs: **26 detected, 25 at the expected confidence, two missed and one confidence/source-role difference**. Exact source-locator hashes disambiguate the two default-category reviews without guessing by filenames or creditor-name similarity. `retest-finding-matrix-turn2-v2.json` records each expected finding, candidate issue, source association, confidence, selection and packet checks; all 26 matched requests appear in the downloaded packet text. The earlier matrix with two unresolved default matches is retained; v2 resolves those matches using exact locator evidence.

| TODO | Recorded original retest outcome on c66a436 | Subsequent repair / remaining proof |
|---|---|---|
| 001 | AU-104 detected as POTENTIAL; frozen review expects DEFINITE printed discrepancy. Consumer statement replaced the own printed payment note. | Direct report note now supports definite printed contradiction; attributed claims stay potential and source-explained reversal is a clean control. Fictional native packet passes; original retest pending. |
| 002 | AU-003 detected POTENTIAL and selected/approved/downloaded. | Qualified old-collection date roles preserved; remaining linked examples pending. |
| 003 | AU-101/104 detected DEFINITE printed status/date discrepancies, with packets. | No definite statutory breach asserted; remaining linked examples pending. |
| 004 | AU-007 detected POTENTIAL, with packet. | Ownership claim remains attributed; no identity-theft finding inferred. |
| 005 | AU-104 detected POTENTIAL with own dated RHI and sale/dispute sources, with packet. | Sale/undated good-payment history do not disprove prior lateness. |
| 006 | AU-003/007/011/018/033 detected PROBABLE, grouped by own report, with packets. | Additional AU-008 geography output is separately recorded for review; coverage is not closed. |
| 007 | AU-008 MISSED. A left-column caption terminated the right-column address before the final postcode line. | Own-column wrapping now survives that intervening row and retains contact/section fences. Fictional native upload/definite finding/packet passes; original retest pending. |
| 008 | AU-011 detected POTENTIAL, with packet. | Filed date remains distinct from judgment-made date. |
| 009 | AU-018 MISSED. Close Account/Type headings were parsed as one type column, losing both masked references. | Header split now requires aligned masked-reference and separate type cells within the same source section; genuine combined-type and different-reference controls pass. Fictional PROBABLE native finding/packet passes; original retest pending. |
| 010 | AU-033 detected POTENTIAL, with packet. | No correct replacement balance invented. |
| 011 | AU-104 detected POTENTIAL, with packet. | No universal consent rule inferred. |
| 012 | AU-097 detected POTENTIAL with preserved header date alternatives, with packet. | Additional AU-011 chronology output is separately recorded for review. |
| 013 | AU-097 detected PROBABLE Paid/positive-balance concern, with packet. | Correct monetary role retained. |
| 014 | AU-101 has both POTENTIAL default reviews, PROBABLE enquiry and hardship reviews, one POTENTIAL dated-RHI current-file review; AU-103 has POTENTIAL ambiguous enquiry review. All selected requests appear in PDFs. | Category clocks, ambiguity and historical/current-file qualification retained; other linked sources pending. |
| 015 | AU-101 detected PROBABLE, with packet. | Original $132 amount retained; no residual/foreign-currency substitution. |
| 016 | AU-101 detected POTENTIAL, with packet. | Both same-account hardship/grid sources retained; alternate arrangements remain possible. |
| 017 | AU-104 detected POTENTIAL, with packet. | Original-zero/purchaser-positive legitimate transfer remains an explicit alternative. |
| 018 | AU-101 detected PROBABLE using exact account/default source association, with packet. | Reissued/refinanced facility/date-role alternatives retained. |

There are **32 additional outputs outside this retest's frozen expected set**: 22 amount-category reviews, six TFN-handling reviews, two closure-date reviews, one geography issue and one chronology issue. They are retained in `retest-additional-output-review-turn2-v2.json` as REVIEW PENDING. They are not silently counted as accepted missed concerns or declared false positives from review omission alone. No zero-false-positive conclusion is supported; clean-control/corpus review remains incomplete.

The original snapshot also exposed missing explicit file custody on some legacy printed-field locations. Shared `multi-file-assembly.cjs` now annotates the copied measured field/caption locations from their per-file input, preserves explicit foreign identities for rejection, and leaves persisted per-file readings unchanged. Reader version 4 ensures stale owned GENERAL extraction can be refreshed through the existing reassessment mechanism. Original snapshot field-custody limitations remain recorded honestly in the private matrix; no additional original re-evaluation occurred after repair.

Latest repaired local manifest: `FCFB9DB5537825B25BF138C9025039874EB2AA14D42BE779915DFDFE5E895284` (`crp-v1-fcfb9db5537825b2`, not hosted). Latest focused receipt `retest-repairs-plain-final-turn2.json`: **845 passed / 0 failed / 0 skipped** across eleven sections, including actual fictional native upload/selected packet, consumer interaction, source readers, governed concerns, reassessment, multi-file custody and plain language. Earlier failed custody-test attempts are retained. The repaired fictional five-page packet was rendered; its letter is legible and preserves both opening-date alternatives in plain language. Shared runtime changes still require final full regression; focused receipts do not close that gate.

Mandatory batch gate: supported uncertainty remains selectable and eligible for factual correction packets; source-linked printed discrepancies remain distinct from actual payment or statutory conclusions; genuine combined columns, different references, foreign fields, reversed payments and consumer-only claims are controls. This is technical repair evidence, not repaired-original acceptance. All eighteen TODOs remain OPEN; staging NOT RUN, production fix verification NOT RUN. Cumulative corpus work is twenty cycles on ten unique originals; **94 originals still need first candidate comparisons**, and changed original examples need another bounded retest. Preservation receipts `original-hash-preservation-turn2.json` and `root-preservation-turn2.json` verify all 104 original PDF hashes and all 144 inventoried dirty primary-checkout files unchanged. No deployment, provider purchase or consumer communication was performed. The next ten-cycle batch is prepared in `next-bounded-batch-turn3.json` (three repaired-example retests plus seven first comparisons), NOT EXECUTED.

## FIX TODO entry fields

- **ID and status:** `FIX-TODO-001` onward; OPEN, DIAGNOSIS PENDING, IMPLEMENTED, or VERIFIED, with separate implementation/staging/production evidence when relevant.
- **Cases and evidence:** report/case aliases, page and account/row locations, relevant values, report date, applicable assessment date, and CRP output reference.
- **AI finding:** concern, supported requirement or discrepancy, internal confidence, material uncertainty, and consumer impact.
- **Comparison:** corresponding CRP finding if any, why it does not cover the issue, and whether the complete output and equivalent inputs were available.
- **Cause and correction:** confirmed or provisional cause, affected mechanism, smallest required change, and any new shared-checklist entry needed. Cite inspected code only after diagnosis.
- **Acceptance:** detection on the missed case, relevant benign/control behavior, source association, consumer selection and eligible packet outcome; link evidence when completed.
- **Schedule link:** existing single-register task/blocker reference when implementation is subsequently authorized and scheduled.


Register privacy maintenance: source account references are shortened to their last four digits and the financial associate uses an alias. Exact source identifiers and original excerpts remain in the unchanged private reviews.


## October 12 combined AU/UK local implementation closure

Current implementation status: **IMPLEMENTED locally**. This supersedes earlier OPEN implementation checkpoints while preserving their original failed or pending validation scope. Branch `codex/au-uk-fixlists-20261012`, checkout `C:\Users\webbd\.codex\worktrees\au-uk-fixlists\CRP-NEW`, base `7a4cf4b56556eb41a79090f61cad1e8662d9e0d1`. Runtime manifest `ADCB114E873CDA953B69C434E693C8F649F873870091E4F603ADE5B0533AB7FC` binds 152 shipped files.

Final full regression: **15,750 passed / 0 failed / 0 skipped**, 162 completed sections, 314 source hashes, zero drift and no unrun sections. The earlier 15,717-pass/one-failure and 15,723-pass/one-failure runs are retained. The latter stopped one text section on a missing generated Wizzard index; exact baseline assets were restored and that section passed 29/0/0 before the final full run. Its cross-report packet source-index defect was repaired; altered, stale and foreign evidence still blocks download. Focused packet/date/UK/AU verification passes **253/0/0**.

Read-only extraction/assessment/issue projections use all **104 AU originals** and **97 UK originals**, with verified original hashes and unchanged candidate source. All **161 AU** and **109 UK** frozen concerns are detected and eligible; both AU default-retention examples retain distinct source records. The 13 recorded identical-date UK chronology false positives produce no output. Paid/settled status does not suppress a printed original default-date review. Known primary dates remain primary; source-owned Last Reported is identified as a determining fallback for qualified review where the primary start is unavailable. Private account-matching hashes do not enter public cards or the verified packet.

This turn completed exactly **ten original HTTP retests**: AU-008/018/097/101/104 and UK-001/014/095/096/097. Nine actual packets were selected, reviewed, approved and downloaded; UK-097 was clean. Rejected pre-upload requests are preserved separately. Those packets measure the earlier source used for their executions. Separate fictional native UK active/closed and paid-default reports verify the final source through the same full-access account and approved PDF without consuming an original-report cycle. The full regression supplies final-source representative packet safeguards. This is not a claim of 201 new original HTTP/approval cycles, nor closure of separately recorded additional-output or confidence reviews.

Private evidence root: `C:\Users\webbd\.codex\private\crp-ai-comparison\implementation-2026-10-12\au-uk-fixes`. Final receipts: `full-final-b2-evidence.json`, `full-final-b3-evidence.json`, `full-final-b4-evidence.json`, `au-final-source-projection.json`, `uk-final-source-projection.json`, `final-status-period-controls.json`, `original-retest-summary.json` and `current-uk-packet-acceptance.json` and `paid-default-uk-packet-acceptance.json`. See `CRP_AU_UK_FIXLIST_LOCAL_IMPLEMENTATION_2026_10_12.md` for the joint validation scope. Historical independent reviews and production responses remain unchanged.

**Staging verification NOT RUN; production verification NOT RUN; no deployment authorized.** The exact existing credentials remain private and provide annual complimentary subscriber access locally. No provider purchase or consumer communication was made.
