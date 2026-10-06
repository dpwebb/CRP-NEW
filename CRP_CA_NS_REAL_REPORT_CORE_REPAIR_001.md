# Canada / Nova Scotia real-report missed-issue repair — October 6, 2026

Owner authority: real TransUnion report returns zero despite owner-identified SOL, missing-DOFD and other concerns; this is the highest-priority core failure. Reopens BLOCKER-REPORT-DATA-TO-ISSUE-001 for demonstrated useful-assessment gaps. Cline remains sole implementation writer. No competing runtime edits were made by this diagnostic.

## Measured reproduction

Authorized input: owner's CA Transunion 001.pdf, local only; never copy it into Git or upload it to staging without separate authorization. Region CA-NS. Production model + extraction recognizes FAM-TU-CA-CONSUMER, report date 2026-01-10, four TU_CA_TRADELINE accounts. Real local HTTP upload returns 201; free assessment returns 201; distinct issue total 0. Initial owner format-refusal is not reproduced by this current local build: investigate exact deployed upload/rejection separately; do not weaken structural admission blind.

## Demonstrated engine/reader gaps

1. NS CA-NS-CRA-S10-3-C-LIMB-1 is rejected for every TU account by PRESENTATION_NOT_SUPPORTED (PR-01 only). Reuse the reader's source-linked last-payment facts with correct record kind, admitted authority and qualified issue semantics; inspect the full timing condition and adverse-content scope. Do not assert aged satisfactory/zero-balance accounts are unlawful merely because old.
2. All four account narrative_legend objects are empty despite printed legends. Exact production lines end in carriage return (\\r). narrativeLegend anchors /^\\s*Legend:\\s*(.+)$/ without trimming the returned native line. Demonstrate the defect and smallest normalization fix with real-file and CRLF controls; preserve source locations. Codes AC, CG, WO, TC, CZ are captured, their printed meanings are lost.
3. First Delinquency Date is kept in printed only. Capital One prints 2023-12-16; FIDO prints that caption without a value while its same account reports MOP 9 and TC/CG collection/cancellation narratives. Map the explicit date to the shared decisive fact and preserve explicit blank separately. Build a supported POTENTIAL verification for adverse/collection entry with no usable delinquency anchor where the affirmative context makes the omission material; do not label all blanks statutory omissions.
4. Charge Off Date is blank on Capital One while the same account's 2024-07 row prints WO (Bad debt write-off). Evaluate a qualified verification request for the event/anchor, not a proven mandatory omission without authority.
5. Closed Date is blank on FIDO (CG), Rogers (CZ), and Bank of Nova Scotia (AC), whose own legends indicate cancellation/closure. Evaluate each as qualified factual completeness concern; do not equate OPEN product type with lifecycle status. Do not invent closure dates or force three findings if the evidence contract does not support them.
6. Payment-history detector only compares conflicting codes for the SAME month; it does not validate printed delinquency dates versus history, chronological progression or summary counts. Inspect the actual history before admitting useful additional verification signals; cumulative counts are not assumed to cover the visible grid and unknown X is not delinquency.

These are concrete candidates and failed mappings, NOT a claim six confirmed legal violations have been established. No target issue count is allowed.

## SOL / reporting-period distinction

Investigate both clocks against accepted official NS authority and printed adverse-account facts. Court limitation expiry is not itself a credit-report deletion requirement. Do not substitute last payment for claim discovery, exclude acknowledgments or assume litigation/collection conduct not shown. A supported limitation-related concern may be a qualified verification/next-step item; label it according to what is actually shown. Relevant current leads: official NS Limitation of Actions Act (2014 c35), Consumer Reporting Act s10(3)(c), FCAC credit-report retention guidance. Retain relevant existing source captures; no repeated whole-corpus inventory.

## Required connected completion

Repair accepted real-format upload behavior if a actual production defect is reproduced. Connect material native-text facts -> useful jurisdiction-appropriate actual/probable/potential issue -> accurate free counts/teaser -> one-time full assessment/download -> subscriber selected packet/review/approval/download. Keep all purchase boundaries and sandbox billing. Add real-file local upload assertions for this exact supplied report plus privacy-safe fictional positive/benign/refusal controls. Never assert zero as success merely because a mapped check failed to execute.

Measure each candidate: printed evidence, extraction result, check applied or missing, issue decision/reason, consumer/packet outcome. Distinguish proven negative from unexamined. Preserve no-issue controls, own-account association, raw readings/locations, no forced severity or breach, approval binding and paid access. Use focused checks during fixes and one final full regression. Return exact issue inventory on this report, including any withheld candidate and concrete reason; do not stop at another adapter-count or arithmetic-only completion. Refresh manifests/records and commit locally. Do not deploy private input, alter live billing or silently reduce version1 promise.