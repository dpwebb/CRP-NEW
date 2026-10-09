# Single unpaid VIOLATION preview — October 8, 2026

## Status

Implementation closed. Staging verification pending. Production remains open.

## Consumer outcome

Before purchase, an assessed report shows at most one eligible VIOLATION example, chosen in this order:

1. Reporting time-limit breach.
2. Corroborated duplicate or linked original/collection amounts both due.
3. Conflicting account dates.
4. Readable same-period payment-history conflict.
5. Conflicting account status or amounts.
6. Source-proven printed blank dates.
7. Corroborated responsibility conflict.
8. Source-bound prior-report first missed-payment date moved later.

The preview says: “This is the most serious violation we found that you can dispute.” Titles, date-conflict and re-aging descriptions use familiar words. Qualified time-limit examples retain an uncertainty note. Stable issue IDs resolve ties; internal confidence does not change the order.

Court-deadline INFORMATION, weak similar entries, identity-review observations, unlabeled later-expiry reviews and ineligible issues cannot become the VIOLATION example. Existing full results, counts, source facts, packet decisions and purchase access remain intact. No detection predicate or rule classification was expanded. All 82 jurisdictions and 19 checklist rows remain.

## Implementation and evidence

The checklist owns the priority categories. `issues.cjs` derives a safe presentation category before removing internal check IDs, including the strongest supported merged basis. `journey.cjs` projects it for exact saved issue IDs; stored results are not rewritten. `results.cjs` chooses the eligible VIOLATION with highest priority. The UI displays the server's one example.

- Final frozen full regression: **12,552 passed, 0 failed, 0 skipped**; **139 sections**; **237 matching source hashes**; zero drift/unrun; **17/17 re-derived implementation closures**.
- New EO: actual source-backed examples across all eight groups; adjacent precedence in both orders; stable confidence-independent ties; duplicate over printed blank date; merged-content classification; information/review/ineligible exclusions; ordinary unpaid upload and access protection.
- EN: exact historical category recovery with unchanged retained files/results.
- BW/K: one unpaid duplicate preview, plain priority explanation, review-only exclusion and unchanged purchase choices. Existing retention dates and subscriber packet assertions remain.
- Earlier failed focused fixture attempts are retained as nonpassing evidence in ignored `out/batch69`; corrected behavioral checks and the final full gate passed.

Candidate: **crp-v1-53cbdebf04e7f7e6**. Manifest: **53CBDEBF04E7F7E6EFC9E2FA5364890EFE07A11F91A57C731D25F3CA5758CA66**. **111 shipped files**.

## Staging verification boundary

The owner-linked saved case is absent from the current staging data. Do not claim direct verification of that case or reconstruct private/deleted data. A new fictional unpaid report was ingested normally on staging before this release: it contains a duplicate and a lower-priority open/closed-status conflict. Its old preview selected the status conflict. Verification after deployment must show the duplicate on the same saved assessment, one VIOLATION example, protected paid reads, and unchanged retained file/result hashes, without re-upload or re-assessment.

The source package must match committed candidate bytes and frozen tested hashes. The owner's unrelated modification to `IMPORTANT 2026-10-7.txt` is preserved outside source staging and deployment. Restricted staging snapshot, rollback, test billing and `launch_ready=false` remain required. Independent production gates remain open.
