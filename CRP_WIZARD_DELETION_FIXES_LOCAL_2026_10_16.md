# Wizard audit corrections: local work order

Status: IMPLEMENTED_AND_FOCUSED_TESTED; GOVERNED_FULL_PENDING; NOT_DEPLOYED.

Owner instruction: "Fix the three issues locally, making sure deleting a report removes its downstream information without affecting other reports. Test the fixes and keep staging and production unchanged for now."

Root owns product source, documentation, integration and test execution in canonical C:/CRP-NEW, starting from clean main8aa9ea6. The bounded helper supplied only the new GN test section under the recorded AGENTS.md assignment; the other helpers reviewed read-only. Preserve every older worktree, fixture and passing/failed receipt. Local tests use isolated fictional stores and owned disposable processes; retain the original local operational data/runtime. No hosted actions, provider/payment/grants, backup dispatch, deployment, source push or mailing.

## Scope and acceptance

- Deleting a report removes its direct content and copied source facts from all affected saved assessments, result views, assessment PDFs and packet evidence. Other reports retain their own source/history and independent findings; unaffected accounts, reports, account copies and billing remain exact. Dependent selections/approvals are made safe, and recovery explains the deleted comparison without asking to reupload an intact report.
- The deletion screen and confirmation clearly identify the selected report by available filename, bureau, report date and region, using existing identity helpers and safe text escaping. Confirmed deletion cannot leave the deleted report selected merely because the list refresh fails.
- A valid supplied address-document date is reused for the same owned unchanged file in later packets; missing, replaced, deleted, expired or invalid documents retain existing requirements and approval safeguards.

Focused tests must cover dependency chains and saved history, unrelated report/account isolation, real stored-blob deletion and old-URL refusal, packet edit preservation and approval invalidation, truthful recovery, clear deletion identity/Cancel, date reuse and invalidation. Shared changes require one fresh governed full after final source freeze; retain failed attempts honestly. Local acceptance is separate from future staging/production acceptance. Current hosted identities remain the preceding audit's observations, not new observations from this work.

## Consumer edit decision and implementation

The owner explicitly chose: "Protect edits: stop deletion and let the consumer choose whether to replace the affected letter." The stored letter is freeform text; copied comparison facts cannot reliably be removed while preserving every arbitrary consumer edit. An affected custom letter therefore refuses the whole deletion before payment cancellation or blob removal. The UI identifies each affected report by available filename, bureau, date and region and offers Keep or Replace affected letters and delete. Replacement consent binds the exact current affected packet/result/source rows, is rechecked within the state transaction, and refuses newer edits. Only explicitly affected letters are replaced; contact details, saved documents, letter dates and independent settings remain. A custom letter selecting only independent issues retains its row, approval and exact PDF bytes even if an unselected comparison is removed from its assessment.

Structured dependency repair covers every surviving owned saved result, including archived assessments. It removes deleted-ID baselines, recalculates only the comparison check, and rebuilds derived output while retaining own extraction, independent checks and original clocks. Obsolete selected comparisons, source/page choices and issue-bound annotations are removed, approval is cleared only for affected packets, and no alternative comparison is automatically selected. Direct removal and dependent repairs commit together; failed commits cannot unlink blobs. Account deletion retains its existing separate billing safeguards.

Saved document dates bind the exact owned file ID and SHA. New/incomplete packets reuse those dates; already-ready packets keep their own support settings and approval. Legacy dates are recovered only when unambiguous across owned packets; deletion preserves a sole legacy date before removing its origin packet. Conflicts, explicit hash mismatches, replacement IDs, corrupt bytes, impossible dates and existing future/age limits retain their checks. Date metadata stays outside packet material snapshots.

## Focused verification

Evidence root: accelerated-launch/service/out/wizard-checklist-fixes-local-20261016.

- focused-gn-1.json:170/0/0.
- focused-related-1.json:1162 passed,2 failed,0 skipped. The new EH expectation incorrectly allowed empty selection; the new GI check used the wrong upload-page heading. Both test expectations were corrected. Existing corrupt-source/ownership safeguards remain unchanged.
- focused-corrections-2.json:1454/0/0 across ten affected HTTP/browser/complete-packet suites. Real local Chrome1440/390 covers target identity, Cancel, Keep, exact-bound Replace and failed list refresh; actual stored service packet suites cover complete physical pages, edit/save/approval/download/print continuity. Intercepted fictional browser API checks are distinguished from real service/PDF checks and are not hosted or provider proof.
- focused-final-gn-3.json:198/0/0, including the final independent edited/approved packet preservation and distinguishing affected-report labels.

The initial related-selection command rejected three incorrect section IDs before executing product checks; it produced no receipt. No full regression has yet been dispatched. No staging/production observation or mutation has occurred in this local correction task.
