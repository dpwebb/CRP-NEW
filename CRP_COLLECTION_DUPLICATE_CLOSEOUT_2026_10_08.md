# Collection duplicates and court information — Batch 67

Date: October 8, 2026. Implementation is CLOSED; measured staging source, linked-case assessment and download are VERIFIED. Production remains OPEN.

## Owner outcome

Two collection entries with the same source-bound bureau member and masked account references are treated as a duplicate under the active common-error checklist, even when the collection agencies, amounts or assignment dates differ. The strong matching branch does not require matching dates. Supported historical extractions can still match through their existing member-name token, masked account reference and both fixed delinquency/payment dates. No re-upload or history mutation is required.

Court time-limit information is INFORMATION ONLY. It has no dispute request, cannot be selected for a packet, and does not ask the bureau about a court case, judgment or qualifying payment. It is displayed separately from reporting violations, excluded from reporting-issue counts and comparison outcomes, and separately headed in the assessment download. Saved results receive the same public projection and packet exclusion. Internal source facts and conditions remain available for assessment integrity.

## Bounded changes

- The shared reader preserves distinct multiline and compact collection blocks, with each entry's own amounts, dates and source locations. Immediate ambiguous aliases remain one entry.
- The Equifax Canada reader retains a private member-number token and the printed collection agency/assignment date. A reporting-member name is not relabeled as the original creditor.
- Detection, rule assessment, capability and packet evidence share the collection-pair mechanism. Ordinary-account, transfer, zero-balance, source ownership, physical-file and report-segment controls remain.
- Multi-file assembly rebinds valid own fact-source indices to the assembled record index. Contrary bindings stay untrusted; foreign file bindings stay foreign. Original per-file records are not mutated.
- The collection dispute identifies both entries and their source evidence. It may request identification of the original creditor and debt. A missing original-creditor caption does not create an unsupported statutory violation.
- Continuing comparison recognizes collection duplicate groups across owned reports and does not count court information as a reporting issue.

All 82 jurisdictions and the 19 active checklist IDs remain. The private supplied report, its identifiers and hosted case details stay outside source control.

## Verification

Affected checks passed after the concrete reader and source-index repairs. The final reader focus passed 513/0/0 (EJ106, CZ59, DL224, DS124); the integrated duplicate/privacy/comparison focus passed 256/0/0 (EK41, EM69, BZ53, EI93); the Canadian/court focus passed 527/0/0 (R315, CO59, CV82, CR71). Independent bounded review found no remaining material defect in new/saved court information or the source-index repair.

Three full attempts were stopped when they exposed a stale four-check expectation, the compact collection-boundary regression, and an old mixed-form test that depended on a selectable court concern. None is passing full evidence. The mixed-form fixture now uses a source-bound collection duplicate violation and explicitly rejects court information; EB166/0/0 passes with both required forms in the actual archive. No extra stale court-selection expectation was found in the remaining registered sections.

The next full run completed at 12,399 passed / 1 failed / 0 skipped. Its sole failure demonstrated that two explicitly numbered collection entries were merged, overwriting the first delinquency date. Isolated writer 99b08de was reviewed and integrated as f39f733. Explicit numbered collection headings now open separate entries; transfer/date fields within one entry stay continuations. Root EJ114/BJ27/CZ59 focused verification passes 200/0/0. The failed full log and source-bound receipt are retained.

Final frozen regression passed **12,408 assertions / 0 failed / 0 skipped**, **137/137 completed sections**, **234 matching tested-source hashes**, zero source drift/unrun sections and **17/17 re-derived implementation closure records**. Regression elapsed before evidence refresh: **927,450 ms**; total runner elapsed including evidence refresh: **1,005,493 ms**. Candidate **crp-v1-f1672120fa160008**, **110 shipped files**, manifest **F1672120FA1600083C7FA5D2F8494570016D090FDB79EDE32F07B35ABA682839**. All four isolated writer worktrees were archived after serial integration and preservation of any ignored proof.

Fictional approved duplicate correspondence and its evidence page were visually reviewed; this is local packet evidence, not a hosted packet claim.

## Release boundary

Runtime source **c765ee65d5ef5a3a046d1fc0d866e3ba39d83a31** is committed and pushed. Clean committed packaging revalidated all tested-source hashes and the 110 shipped files. Archive SHA-256 **4AC467EBBCB0C1E60C2995E4804045461C8003148A37265B1D6530A848D83719**. Staging activation completed **2026-10-08T19:22:09.652Z** at `https://staging.creditregulatorpro.com`, only for `crp-wizard-staging.service`, with test billing and `launch_ready=false`. The exact previous release **crp-v1-15c68fa73c47bc76** and restricted, hash-verified stopped-service **73-file** snapshot **/opt/crp-wizard-staging/backups/before-crp-v1-f1672120fa160008-1791487328** remain available. Activation verified all 110 runtime/asset hashes; public verification passed five checks for health/identity and the four served assets.

The owner-linked report was re-checked through the normal signed-in browser action at **2026-10-08T19:22:57.410Z**, with no re-upload or state patch. It now shows the missed collection duplicate as VIOLATION and the independent missing-closure-date VIOLATION. Three court-timing items appear separately as INFORMATION. A bounded read-only check of the actual deployed modules verifies two selectable reporting issues, three informational items, null court requests, no selectable court item, reporting-summary exclusion, the retained earlier result and the unchanged original report. The verification itself leaves the state bytes unchanged.

The actual browser assessment download contains two VIOLATION items and three INFORMATION items under separate headings, with no retired bureau inquiries, internal check IDs or private member tokens. Download SHA-256 **9f477ac79e015b0c6f41847ab5bb878b9c6886b66b288d1c4a5273f10ff9ef0c**. Actual screenshots show the duplicate violation and information-only section. The existing one-report purchase remains available; no subscription was injected and no hosted subscriber packet is claimed for this case. Local fictional approved PDF/ZIP and approval-invalidation proof remain separate from this served assessment/download proof.

Private source/report data and case identifiers remain in ignored evidence only: `accelerated-launch/service/out/batch67/` holds focused/final/failed regression receipts, the bounded hosted re-check, downloaded assessment proof and screenshots; `out/staging-duplicate-collections-2026-10-08/` holds package, activation and public-source receipts. The four managed writer worktrees are archived. Final documentation commits do not change the tested or shipped source. No production activation, live charge, email or bureau dispatch occurred.

This bounded repair does not certify every current bureau layout or exhaustive checklist coverage. Existing production source acceptance, capacity, restore/cutover and live-billing gates remain separate.
