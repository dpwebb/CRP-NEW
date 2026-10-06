# OWNER-ACCEPT-010 — Build consistency correction

Issued: October 2, 2026. Status: AUTHORIZED / QUEUED FOR NEXT AVAILABLE WORK SLOT; NOT EXECUTED OR RESOLVED.

## Authority and sequencing

Direct Owner instruction: "resolve these inconsistencies as authorized owner within the next available WO and confirm resolution". This order corrects implementation defects under existing build-plan requirements; it does not waive requirements, amend legal authority, or introduce a new optional enhancement as a launch blocker.

Finish the currently executing bounded batch without concurrent mutations, then execute this order before another feature batch. Preserve that batch's files and evidence; measure the current state first because later code may already have corrected an issue. Do not reapply a fix blindly.

Workspace: C:\CRP-NEW. Stage implementation and deployed verification are authorized using the existing hostinger-vps transport and staging runbook. Production is untouched; Stripe remains in test mode. Preserve historical/superseded evidence and the read-only legacy corpus. Do not expose secrets or private report contents. Synthetic/public fixtures suffice.

## Corrections and mandatory proof

### C1 — Consistent release-evidence validation

Replace the older weaker gate paths with a shared strict validator for all applicable capability blockers, including FDT, clarification, COMMON-ERRORS, ingestion/finding gaps and the five consumer-experience requirements. Preserve existing IDs and authorized criteria. Define the validator's evidence contract explicitly, with migration of current records only after actual revalidation; never rewrite historical evidence as newly passing.

Verify the candidate runtime/content identity and served identity against the actual target release, not an arbitrary nonempty build ID or a self-reported deployed flag. Require criterion-by-criterion expected/measured outcomes and supporting test evidence; validate referenced evidence exists and binds to the corresponding inputs/test outputs. Enforce approved benchmark thresholds and denominators for FDT. Missing criteria, malformed data, local-only results, failed criteria, wrong release, stale relevant code and absent references keep the blocker open.

Allow preserved earlier test evidence only with explicit verified compatibility to unchanged relevant module/input digests; never silently accept an obsolete build. Avoid circular build/evidence hashes. Make target selection usable for normal release checks; lack of a target identity must fail clearly rather than silently default to a claimed identity.

Reproduce the audit's obsolete minimal evidence acceptance in an isolated test. Then prove rejection of obsolete builds, fake deployed flags, empty/nonexistent references, partial criteria and benchmark failure, and acceptance of genuine complete current-release evidence. Include the five new gates; their initial schema is not itself proof that referenced outcomes are genuine.

### C2 — Unique grid-cell association

Correct zipHeaderToCells so a positioned code cell cannot be accepted for multiple independent periods. Reject ambiguous ties, absent cells and incompatible alignment. Resolve geometry using local row/column spacing and documented coordinate units rather than one absolute 40-unit threshold shared between native points and OCR pixels. This is a correction of association logic, not promotion of optional ENH-SCALE-001 to a blocker.

Required regression: headings 2024-01 at x=0..10 and 2024-02 at x=20..30, with one code 30 at x=10..20. The current reader marks both periods certain. The corrected reader must not fabricate two accepted delinquency cells. Test missing middle cells, ties, clean one-to-one alignment and native/OCR coordinate units.

### C3 — Grid confidence and provenance enforcement

Carry word confidence/trust state and source geometry through heading, code-cell and legend interpretation. Low-confidence decisive characters or an uncertain legend cannot become a resolved history reading simply because a code appears in a map. Native trustworthy text is explicitly distinguished from unknown/missing OCR confidence. Use the existing reported-fact policy and confidence rules; do not lower floors to pass a fixture.

Prove that a confidence-1 OCR code is withheld from factual inconsistency/assessment output, and a reliable reading is correctly accepted. Include uncertain period headings and legend glyphs. Preserve uncertain raw readings; do not invent delinquency from blanks. Keep injected confidence tests accurately labelled and separate from actual OCR acceptance evidence.

### C4 — Account/bureau boundary and continuation enforcement

Bound each grid's header/cell/legend search to its actual account and bureau/report section. A legend below the next account must not be borrowed. Continuation must choose an evidenced unique matching account/grid, not the first grid on a previous page; a generic Continued marker plus adjacency alone is insufficient where multiple contexts are possible.

Test two grids on a prior page, another account's legend, ambiguous continuation, new-account boundary, distinct bureau/report dates and valid continuation. Retain unresolved data when association cannot be established. Preserve existing per-file source readings and avoid mutation.

### C5 — Material, consequential clarification

Replace unconditional static question exposure with eligibility based on an actual unresolved material check after bounded recovery. Link every question to a specific account/record, missing fact and useful outcome. Use plain English, maximum two questions, I don't know and Skip; do not ask consumers to resolve legal rules or technical parsing details.

Answers remain CONSUMER_STATEMENT with separate provenance, never silently overwrite report readings or escalate a finding. An answer must enable a permitted useful reassessment or an accurate material explanation; otherwise do not ask the question. Validate choices and bounded free-text length; do not accept arbitrary choice values. Save/cancel/skip preserve independent results and downloads. Eliminate misleading general promises of benefit when answers are only stored.

Verify a no-question case, one useful account-specific question, I don't know, Skip, conflicting answer, invalid input, persistence, no unauthorized finding escalation and a real-browser journey. If browser access is unavailable, prepare the handoff and keep the specific criterion unresolved; do not substitute node:vm/API evidence.

### C6 — Accurate release reporting and plan/register alignment

Remove obsolete advice that payment-provider authorization has not been granted. Distinguish implemented sandbox billing from remaining live configuration. Generate next actions from actual failed gate results and preserve authority/deployment boundaries. Report local/candidate/served identity and validation scope accurately.

Mechanically recompute blocker totals after these corrections. The audit measured 44 checks and 17 local launch blockers after adding five consumer-experience gates; this is a dated measurement, not a constant or a required future result. Align plan status, acceptance register and release output without carrying stale counts or claiming a gate closed from documentation.

## Execution and confirmation

Implement C1-C6, run meaningful focused tests and the appropriate regression suite, deploy verified runtime corrections to staging with data-safe snapshot/rollback and remote file hashing. The local release checker is not automatically served runtime; verify target identity/evidence deliberately and record that distinction. Re-exercise affected native-PDF/image and result/download paths on the deployed service. Use the existing purchased case correctly and do not repeat Checkout unnecessarily.

Produce CRP_OWNER_ACCEPT_010_BUILD_CONSISTENCY_RESOLUTION.md and a new SOURCE_CAPTURES\ACCEPT-010\ evidence package containing the initial reproductions, per-correction expected/measured results, test outputs, candidate/served identity, deployment/rollback record and preservation record. Do not overwrite old acceptance packages. Link each C1-C6 status to the exact supporting evidence.

Completion requires a resolution matrix for all six issues. A code edit, passing aggregate assertion total, generated evidence flag or successful deployment alone is insufficient. Retain any unfinished criterion as OPEN and report this order PARTIAL. Confirm RESOLVED only for measured passing corrections; explicitly identify any browser handoff or actual OCR acceptance still unproven. No public-launch authorization is issued by this order.
