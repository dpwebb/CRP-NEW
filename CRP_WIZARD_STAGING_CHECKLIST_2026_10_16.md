# Revised Wizard staging checklist and deletion review

Status: STAGING_AUDIT_WITH_CONFIRMED_FINDINGS; NEW_FIXTURE_CLEANUP_COMPLETE. The actual desktop upload-to-edited-approved-download journey passed with manual file selection. Downstream deletion fails as described below. Cancel and native print-dialog acceptance remain unverified. Production is unchanged; no product fix or deployment was performed.

Owner instruction: "Run through the checklist on staging and report any issues with the revised Wizard. Keep production unchanged. Pay special attention to the users ability to delete existing credit reports and thier information downstream."

Root alone controls browser/API/test-fixture actions and evidence integration. Helpers review source/evidence read-only. Use new dated fictional reports, documents and own test cases; delete only the reports created for this test, never real consumer reports or the older retained release fixtures. An existing explicitly fictional paid/full-access QA account may be signed in normally for new dated test cases, with its prior profile, documents, reports, billing and entitlements preserved. No new access grant or provider configuration. Preserve original once-only operations and expired retention campaigns; do not resume older purchase/native/cleanup attempts. No production action, real-owner recovery/MFA, mailing, source push, repair or redeployment.

Verify fresh ca463 staging identity and current account/data/configuration custody before testing. Exercise upload, correct report identity/grouping, issue selection, missing-only preparation, complete inline review, letter editing, approval, actual download/PDF review, saved-report/latest routing and report deletion. Inspect downstream results/packet/download access, stored report blobs/derived rows and isolation from other reports and reusable account documents. Record any intentionally retained audit/payment/job metadata separately from removal of live report content. Downloaded local PDFs cannot be recalled by server deletion.

Use current browser DOM and documented Cua controls; preserve older tabs/drafts. No browser-controller bypass or fabricated dialog outcome. Record actual failed, incomplete and passed checks with their scope. Fresh staging read-only custody and exact production preservation close the test; report issues before any corrective implementation.

## Resumed actual staging checklist

The owner manually selected each of the two named fictional PDFs after the extension's automated chooser remained blocked. Screenshots confirmed the selected filenames before root clicked Upload. The read-only DOM evaluator's input.files list was empty even while the screenshot visibly showed the manually selected file; that property is not authoritative file-selection proof in this controller. This corrects the interpretation of that DOM-only observation without relabeling either failed automated chooser call as successful.

| Check | Resumed actual result |
| --- | --- |
| Upload A, direct Results, report identity and account grouping | PASS. A was uploaded once, checked once and opened identified Results with two account groups. Two issues were selected there; no separate Check/Choose step or assessment attestation appeared. |
| New saved-report ordering and Resume latest | PASS for A and B. Each new upload appeared first. A and then surviving B opened through Resume latest. After cleanup neither test report appeared. |
| Missing-only preparation | Saved contact details and all three copies were reused without changes or repeated identity/copy-quality confirmations. A required only the address-copy date, entered as October8 from the actual fictional document. B requested the same date again; see finding3. |
| Complete Review and Save | PASS for A. All7 inline pages were observed: instructions, editable letter, report, adjacent notes, two ID copies and address copy. Root added "Please confirm each correction in writing." and selected Save and review packet; the complete7-page packet and edit survived. No highlight tools or contact/upload buttons appeared on Review. |
| Approval and actual download | PASS. Approval enabled delivery. The actual browser saved335048-byte PDF840C113DFD7EA8ECE5FAF90363C4F3B9EA14FE77DE00FE5D4E73FB89EF316B79, exactly matching the stored approved PDF hash. All7 downloaded physical pages were separately rendered and visually inspected, including the edit. The first download wait timed out/reset the controller after saving; a second read-only click also saved identical bytes. Neither wait failure nor the empty CDP response body is claimed as successful PDF capture. |
| Print control | The actual button returned200 from packet-print and opened a blob PDF tab. Native PDF/print-dialog inspection and physical printing are not claimed; the owned preview tab was closed. |
| Comparison packet before deletion | B displayed A-derived re-aging facts. Two selected issues, including that comparison, produced9 inline pages with both source reports; all9 were observed and B was approved before deleting A. |
| A direct deletion | PASS for active-service removal. Its case/file/result/packet rows and source blob were removed; saved/latest lists no longer contained A. Nine actual authenticated browser URL checks returned404 for case, results, saved result, packet, source, prior preview, cached page, download and print. |
| A downstream deletion | FAIL. B's result retained A's frozen baseline and still displayed A's report date, missed-payment date, name, masked number and other copied facts. A new actual assessment download returned200 and included those facts. B's packet/old preview/download/print correctly refused with409 PACKET_APPROVAL_STALE, but Review misleadingly instructed the consumer to upload their report again although B's own source was intact. |
| Cancel confirmation | UNVERIFIED_CONTROLLER_LIMIT. One A Delete click timed out, enumeration showed a confirm, and documented dismiss reported no dialog. Subsequent UI and host custody proved A was deleted. This is not Cancel proof or evidence that the app ignored a confirmed Cancel; do not replay A. |
| Final cleanup and sign-out | PASS, human-assisted for B's native confirmation. Root clicked Delete once for only the new B report; documented accept stalled. The owner replied "Clicked OK". Subsequent UI, four browser404 checks and host custody proved both new reports/rows/blobs absent. Normal QA Sign out showed Signed out; only owned test/probe/print tabs were closed. No viewport override was applied. |

Owned new cases: A case_706c9a8b6c41070956e91584 / source5c820ca7a847a82254b754a360f0a49d; B case_a17352980f4316acf618042a / sourcea623e4aec38aa9bb81f6ba93c8d8e7b3. Their uploaded source hashes exactly match the preflight manifest. No old consumer/QA report, old stopped fixture, account copy, profile, subscription, entitlement or checkout was deleted or edited.

This is bounded desktop staging evidence with identified failures and limitations, not a strict30/123/46 release pass. Mobile/viewport testing, native print-dialog inspection, confirmed Cancel and backup-erasure timing were not established. Original17522/0/0 full/package and shipped/tested bytes remain unchanged; no rebuild, product regression rerun, deployment, payment/provider action, backup dispatch, production mutation or source push occurred.

## Initial partial staging observations (historical)

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

CONFIRMED_ON_STAGING, in addition to the preserved earlier local reproduction. The current reaging.freezeBaselines stores earlier report records inside a later assessment's evaluation.reaging_baselines. cases.deleteCase removes rows directly owned by the deleted case but does not remove those copied records from other cases/results.

The isolated diagnostic created fictional A and B with different report/first-missed-payment dates for one matched account. After the real cases.deleteCase function deleted A's case/result/packet rows and requested deletion of A's source blob, B remained with an unchanged frozen baseline referencing A. B's generated assessment body still included A's2025-06-12 report date and2018-01-01 first missed-payment date. This proves incomplete removal of downstream copied facts in the current code, without pretending it was observed through staged deletion or an actual downloaded PDF. The other report and reusable account ID row were correctly preserved in that local reproduction.

Sources: C:/CRP-NEW/accelerated-launch/service/cases.cjs:107 and C:/CRP-NEW/accelerated-launch/service/reaging.cjs:194. Earlier local evidence: local-deletion-reproduction.cjs and local-deletion-reproduction.json. Source inspection predicted that a dependent packet would refuse access when deleted source bytes could not be found; the resumed staging checks below now verify that refusal. Removing a whole later report would discard independent consumer work, so the correction needs explicit handling of affected derived facts, assessments, selection, preview and approval, retaining that report's own source and edits. No fix was implemented.

Resumed staging proof supersedes the preceding source-only delivery expectation: A-deleted-scope.json shows all six direct row categories0 and A's physical source blob absent, while B's case/result/packet hashes remain exact to both-approved-scope.json and its frozen baseline still references A. browser/B-results-after-delete.dom.txt displays A's earlier facts. The actual downloaded pdf/B-assessment-after-A-delete.pdf (SHA256 A18DF2CB5833F8595C4E9CB08349141959081AE0DD7EC9520A947865EF015263) contains those facts in its extracted text at lines84-117. browser/deleted-A-and-dependent-B-url-checks.json binds nine A404 responses and four B409 responses. browser/B-review-after-delete.dom.txt/png records the misleading reupload recovery. B itself and its source were intact at that checkpoint; both new cases were subsequently cleaned without editing their results to hide the finding.

### 3. The same reused address document asks for its date again

CONFIRMED_ON_STAGING, minor repeated-entry issue. A's preparation saved October8,2026 for fictional-address.pdf. Preparing B reused the same three account-document IDs but again presented a blank Date on fictional-address.pdf as missing. The copies and contact details are reused, but the date supplied for that unchanged copy is packet-scoped and not reused between these packets. Evidence: browser/A-prepare.dom.txt, A-prepare-view.json and browser/B-prepare-repeat-date.dom.txt. No document metadata/profile or product code was changed to correct this.

### Other boundaries and unverified risks

The current deletion notice expressly says backup erasure timing is unverified. Reusable account ID/address copies, external provider records and administrative audit/job metadata have separate scopes; they should not be represented as purged by deleting one report. Source inspection also finds that a failed list refresh after successful DELETE can leave stale UI selection, and blob unlink failures are counted but not necessarily surfaced. These are follow-up test risks, not additional observed staging failures.

## Preservation and continuation

Evidence root: C:/Users/webbd/.codex/worktrees/packet-footer-local/CRP-NEW/accelerated-launch/service/out/wizard-staging-checklist-20261016/.

Final preservation at15:13:01Z passed, with stable final row/blob observations and independent review. final-after.json and final-deleted-scope.json prove both new cases/files/results/packets/drafts/purchased-download rows0 and both new blobs absent. All original148 blob paths/hashes,43 accounts,718 non-session rows, code/configuration/private/signed authority remain, with exactly one enumerated QA account-field difference: payment_history_checked_at. The original stopped-snapshot account hash again matches the original fresh baseline; final-qa-cache-observation.json proves only that cache field changed, linked to the prior field-only receipt, with no raw account values exported. All other original717 non-session row hashes remain exact. No blanket authentication, diagnostic, account or business-data exception is used. Normal sessions are observed1 before sign-in,2 during testing,1 after QA logout; equality of session contents is not claimed.

Production's entire final site observation is exact to both the original and resume baselines:31b/169 runtime files,5 accounts/338 non-session rows/109 blobs, raw state, configuration, signed/private authority, activation metadata and PID3514245. Staging remainsca463/171 files/PID3470121. Boot and required unit definitions match; monitor scheduling timestamps may advance. final-preservation.json binds the comparison and receipts. The initial read-only scoped observer rejected an incorrectly prepared /opt data-path guard before reading state; corrected scoped reads bind the independently observed /var/lib/private/crp-wizard-staging path. That failed observation is retained in scoped-observe-first-failure.json. No host writes or service actions occurred.

The following paragraphs retain the earlier partial checkpoint rather than describing the final state.

The13:19:31Z partial after comparison passed. Production's entire site observation is exact to the fresh before baseline: code169, raw state,5 accounts/338 non-session rows/109 blobs, environment, signed authority, activation metadata and PID3514245. Boot and unit definitions match. No production, provider, deployment, service, backup, mailing or outreach action was performed.

Staging's cases/results/drafts/packets/billing and all other non-session rows,148 blobs, runtime/configuration, signed/private files and volatile admin hashes remain exact. All43 accounts remain. Precisely one known fictional QA account row differs only in payment_history_checked_at; the original row was recovered read-only from the existing stopped snapshot and its canonical hash independently matched this test's fresh before baseline before field comparison. The other42 accounts are exact. Sessions changed1 to2 through the one normal QA sign-in. This is an enumerated field/session observation, not a blanket authentication or diagnostic exception. No old report, document, payment, profile or entitlement changed; no new report/case was created.

Preserved artifacts: before.json, partial-after.json, partial-preservation.json, qa-auth-cache-observation.json, browser/observed-responses.json, browser/resume-latest.dom.txt and browser/handoff.json. The two new local fictional PDFs and their manifest are in fixtures/; neither was uploaded. No product/tested/shipped source bytes changed. The remaining checklist must resume from the new QA tab after the required Chrome upload permission is confirmed; keep production and every older stopped attempt unchanged.
