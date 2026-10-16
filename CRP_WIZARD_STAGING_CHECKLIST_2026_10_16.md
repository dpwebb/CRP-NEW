# Revised Wizard staging checklist and deletion review

Status: PARTIAL_BROWSER_UPLOAD_BLOCKED. Production unchanged. The new QA tab is preserved for continuation after Chrome file-access permission is enabled. No report deletion or full hosted packet journey is claimed.

Owner instruction: "Run through the checklist on staging and report any issues with the revised Wizard. Keep production unchanged. Pay special attention to the users ability to delete existing credit reports and thier information downstream."

Root alone controls browser/API/test-fixture actions and evidence integration. Helpers review source/evidence read-only. Use new dated fictional reports, documents and own test cases; delete only the reports created for this test, never real consumer reports or the older retained release fixtures. An existing explicitly fictional paid/full-access QA account may be signed in normally for new dated test cases, with its prior profile, documents, reports, billing and entitlements preserved. No new access grant or provider configuration. Preserve original once-only operations and expired retention campaigns; do not resume older purchase/native/cleanup attempts. No production action, real-owner recovery/MFA, mailing, source push, repair or redeployment.

Verify fresh ca463 staging identity and current account/data/configuration custody before testing. Exercise upload, correct report identity/grouping, issue selection, missing-only preparation, complete inline review, letter editing, approval, actual download/PDF review, saved-report/latest routing and report deletion. Inspect downstream results/packet/download access, stored report blobs/derived rows and isolation from other reports and reusable account documents. Record any intentionally retained audit/payment/job metadata separately from removal of live report content. Downloaded local PDFs cannot be recalled by server deletion.

Use current browser DOM and documented Cua controls; preserve older tabs/drafts. No browser-controller bypass or fabricated dialog outcome. Record actual failed, incomplete and passed checks with their scope. Fresh staging read-only custody and exact production preservation close the test; report issues before any corrective implementation.

## Actual staging observations

The fresh read-only baseline at2026-10-16T13:09:55Z verified stagingca463/b22e/171 files/PID3470121 and production31b/169 files/PID3514245. These current PIDs differ from October15's deployment checkpoint; no service action was performed in this test. Root opened a new QA tab in Chrome profile David and normally signed into the explicitly fictional monthly-CAD consumer. Its current Plans page showed active access through November15. No new payment, grant or checkout was made.

| Check | Actual result |
| --- | --- |
| Fresh fictional sign-in and current subscription | PASS through the actual UI. |
| Five visible steps, retired Check/Choose pages absent | PASS in current staging DOM. |
| Country/region/bureau choices | PASS for Canada/Nova Scotia/Equifax Canada. |
| Upload fictional report A | BLOCKED by Chrome extension file access. The documented chooser opened, but setFiles refused with the Allow access to file URLs requirement. A subsequent DOM check showed zero selected files. No upload or case creation was dispatched. |
| Existing saved report opens Review results | PASS, read-only existing fictional summary-benign.pdf. Correct filename/bureau/report date/region shown. No separate Check/Choose page. |
| Resume my latest report | PASS, read-only, returns the same correct latest report's Review results. |
| New-report ordering and grouping/selection | NOT_RUN; new upload is blocked. The benign existing report has no selectable dispute items. |
| Missing-only preparation and saved-copy reuse | NOT_RUN for a new packet. Existing account inventory shows its three fictional reusable copies; no copy/profile was changed. |
| All-page packet review/edit/Save/approval/real download | NOT_RUN for this current hosted test. Earlier local17522/0/0 proof is not relabeled as a staging pass. |
| Delete/Cancel and downstream URLs/blob removal | NOT_RUN on staging: no new owned disposable case exists, and older retained cases were not deleted or edited. |
| Deletion screen target clarity | FAIL, observed on staging, detailed below. |

Chrome's documented upload troubleshooting requires enabling Allow access to file URLs under the ChatGPT extension's Details in the David profile. Root requested that setting through the user-input control. No permission was changed or bypassed, no hidden browser/API upload substituted, and no dependent upload was retried without confirmation. The QA tab was returned to Upload report and marked for handoff; all older tabs/drafts remain untouched.

### File-access confirmation and unsuccessful documented retry

The owner subsequently replied "Enabled file access". Root refreshed the current Upload DOM, selected Canada/Nova Scotia/Equifax Canada and retried the documented chooser once. Chrome still returned the same Allow access to file URLs refusal. A fresh DOM inspection again showed input#file.files empty; no Upload click, new case or deletion occurred. This is an unresolved browser permission/controller prerequisite, not a demonstrated application upload failure. Evidence: browser/upload-permission-retry.json and browser/upload-permission-retry.png. Root asked the owner to select only fictional-wizard-delete-A-20261016.pdf manually in the preserved QA tab, without clicking Upload. That selection remains pending; do not retry or bypass the chooser guard, or infer an upload from the permission answer.

Fresh resume-before.json at2026-10-16T14:57:38Z passed stable read-only custody. Production's entire site observation is exact to partial-after.json. Staging's non-session row hash tables, root values, all148 blobs, runtime/configuration, signed/private/volatile authority and observed session count remain exact to that partial checkpoint. Only staging's raw state SHA differs; this observation does not claim exact session contents or explain that byte difference. No host/service/provider action was performed. The full hosted upload/edit/approve/download/delete checklist remains pending.

## Findings

### 1. Deletion screen does not clearly identify the report being deleted

CONFIRMED_ON_STAGING. After opening summary-benign.pdf from saved reports, Privacy and deletion showed only Open status and Wales/United Kingdom in its target card. It omitted that selected report's filename, bureau and report date. The inventory below listed every report, including multiple entries for the same region, without marking the selected target. The destructive control is labelled Delete this report and its files; the source's confirmation message also says only this report.

This creates a practical risk of choosing the wrong report, especially with several reports from the same region. The smallest correction is to show the selected report's identity beside the delete action and repeat it in the confirmation, with a clear connection to the selected saved-report row. No correction was implemented.

Actual DOM/screenshot evidence: browser/privacy-delete-target.dom.txt and browser/privacy-delete-target.png. Read-only selected case: case_65cd84de98eed8e2eb7d3fc5. It was not changed, marked, reassessed or deleted. Source: C:/CRP-NEW/accelerated-launch/service/ui/app.js, renderCase/deletion handler around2716-2774.

### 2. Deleting an earlier report leaves copied facts in a later report's assessment

CONFIRMED_LOCAL_REPRODUCTION_OF_CURRENT_SOURCE; STAGING_DELETION_PENDING. The current reaging.freezeBaselines stores earlier report records inside a later assessment's evaluation.reaging_baselines. cases.deleteCase removes rows directly owned by the deleted case but does not remove those copied records from other cases/results.

The isolated diagnostic created fictional A and B with different report/first-missed-payment dates for one matched account. After the real cases.deleteCase function deleted A's case/result/packet rows and requested deletion of A's source blob, B remained with an unchanged frozen baseline referencing A. B's generated assessment body still included A's2025-06-12 report date and2018-01-01 first missed-payment date. This proves incomplete removal of downstream copied facts in the current code, without pretending it was observed through staged deletion or an actual downloaded PDF. The other report and reusable account ID row were correctly preserved in that local reproduction.

Sources: C:/CRP-NEW/accelerated-launch/service/cases.cjs:107 and C:/CRP-NEW/accelerated-launch/service/reaging.cjs:194. Evidence: local-deletion-reproduction.cjs and local-deletion-reproduction.json. A later packet is expected from source inspection to refuse access when the deleted source bytes cannot be found; that delivery/refusal behavior still requires actual staged verification. Removing a whole later report would discard independent consumer work, so the correction needs explicit handling of affected derived facts, assessments, selection, preview and approval, retaining that report's own source and edits. No fix was implemented.

### Other boundaries and unverified risks

The current deletion notice expressly says backup erasure timing is unverified. Reusable account ID/address copies, external provider records and administrative audit/job metadata have separate scopes; they should not be represented as purged by deleting one report. Source inspection also finds that a failed list refresh after successful DELETE can leave stale UI selection, and blob unlink failures are counted but not necessarily surfaced. These are follow-up test risks, not additional observed staging failures.

## Preservation and continuation

Evidence root: C:/Users/webbd/.codex/worktrees/packet-footer-local/CRP-NEW/accelerated-launch/service/out/wizard-staging-checklist-20261016/.

The13:19:31Z partial after comparison passed. Production's entire site observation is exact to the fresh before baseline: code169, raw state,5 accounts/338 non-session rows/109 blobs, environment, signed authority, activation metadata and PID3514245. Boot and unit definitions match. No production, provider, deployment, service, backup, mailing or outreach action was performed.

Staging's cases/results/drafts/packets/billing and all other non-session rows,148 blobs, runtime/configuration, signed/private files and volatile admin hashes remain exact. All43 accounts remain. Precisely one known fictional QA account row differs only in payment_history_checked_at; the original row was recovered read-only from the existing stopped snapshot and its canonical hash independently matched this test's fresh before baseline before field comparison. The other42 accounts are exact. Sessions changed1 to2 through the one normal QA sign-in. This is an enumerated field/session observation, not a blanket authentication or diagnostic exception. No old report, document, payment, profile or entitlement changed; no new report/case was created.

Preserved artifacts: before.json, partial-after.json, partial-preservation.json, qa-auth-cache-observation.json, browser/observed-responses.json, browser/resume-latest.dom.txt and browser/handoff.json. The two new local fictional PDFs and their manifest are in fixtures/; neither was uploaded. No product/tested/shipped source bytes changed. The remaining checklist must resume from the new QA tab after the required Chrome upload permission is confirmed; keep production and every older stopped attempt unchanged.
