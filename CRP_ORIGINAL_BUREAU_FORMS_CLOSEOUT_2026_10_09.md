# Original bureau forms and consumer letters — Batch 71

## Owner request and scope

Fill the bureau's original PDF with saved contact details and selected disputes. Use its native dropdowns, text fields, checkboxes and radio choices where available. Preserve the original printed pages, branding and instructions. Accompany the forms with a plain first-person business letter suitable for the application's junior-high-educated audience. The consumer checks and approves the documents, then signs and mails them.

Implementation: **CLOSED**. Staging: **PENDING**. Production: **OPEN**.

All 82 jurisdictions and the active common-error checklist remain. Court-suing deadlines are consumer information and never dispute requests. The one-off report purchase retains assessment access; packet creation remains a subscription feature. Unrelated dirty pricing notes and the score prototype are preserved outside this batch.

## Verified original sources

| Original | Official source | Controls |
|---|---|---|
| Equifax Canada — accounts | [Original PDF](https://assets.equifax.com/assets/canada/english/Accounts_Dispute_Form_EN.pdf) | Five original pages; static input blanks |
| Equifax Canada — collections/public records | [Original PDF](https://assets.equifax.com/assets/canada/english/Public_Records_Dispute_Form_EN.pdf) | Three original pages; static input blanks |
| Equifax Canada — personal details | [Original PDF](https://assets.equifax.com/assets/canada/english/Personal_Info_Dispute_Form_EN.pdf) | Three original pages; static input blanks |
| TransUnion Canada | [Original PDF](https://www.transunion.ca/content/dam/transunion/ca/consumer/documents/Credit-Investigation-Request-Form-en.pdf) | Two original pages; 74 native fields, including province dropdowns and response-method radio choices |
| Equifax US | [Original PDF](https://assets.equifax.com/assets/personal/Dispute.pdf) | Five original pages; static input blanks |
| Experian US | [Original PDF](https://www.experian.com/blogs/ask-experian/wp-content/themes/exp/pdf/dispute-form.pdf) | Two original pages; 67 native fields, including dispute-reason radio choices |

The four Equifax current downloads exactly match the recorded original SHA-256 values. Experian US is linked by the [current official mail instructions](https://www.experian.com/blogs/ask-experian/credit-education/faqs/instructions-for-disputing-by-mail/); its original is added with its verified hash. TransUnion Canada still links the recorded original, whose local hash is valid; its direct fresh download returned 403. This is a source-link verification, not a claim that fresh TransUnion bytes were downloaded.

The currently linked TransUnion Canada form prints an older Burlington address. Its [current ordinary-dispute instructions](https://www.transunion.ca/assistance/credit-report-disputes) direct mail to **P.O. Box 338, LCD1, Hamilton ON L8L 7W2**. The original is preserved, and the letter and mail instructions clearly use Hamilton.

No ordinary official dispute PDF was found in the bounded official-source search for TransUnion US, UK bureaus or Australian bureaus. Those supported routes retain the personalized letter and evidence packet. A report-order form or mailing label is not substituted for a dispute form. This does not assert that no form exists anywhere, or that bureau forms are universally required by regulation.

## Implementation and review

One selected, ordered packet snapshot supplies the letter and forms. A read-only review caught and root fixed an assessment-order versus selection-order mismatch; the form slots and numbered letter requests now share the consumer's selected order, and that order is material to approval.

The form renderer runs locally. Private values travel through worker stdin rather than process arguments, temporary files or external services. Original template hashes, mapping/rendering versions and completed output digests bind the approval. Saved profile or dispute changes require a fresh review. Owned, subscriber-gated PDF previews show the actual letter and filled original before approval.

Separate given and family names are explicitly supplied where an original requests them. Runtime does not guess them from a full name. Dropdown values must match actual original choices; unavailable values remain unselected with a plain request for the required detail. Generic reporting conflicts do not automatically assert fraud, ownership denial, bankruptcy or paid status. Signatures and consent remain unselected for the consumer.

Long information and excess accounts use linked continuation pages rather than clipped or silently truncated answers. Missing full account numbers are never invented; the supported printed partial number or a letter-item reference identifies the selected entry.

Final review corrected four concrete form details: saved apartment/unit information is retained, page/line evidence objects print as readable locations, a generic Canadian identification reference is not asserted as a SIN, and TransUnion's separate printed name columns show the explicitly supplied family/given/middle/suffix values. The original single Name widget and its artwork remain. Multiple selected issues share an account slot only when they have the same explicit assessed record index; every request and numbered letter link remains. Distinct records with matching masked numbers stay separate.

The isolated writer's revised form section passed 128 checks. Read-only integration review independently checked the original TransUnion label/widget coordinates and a two-collector duplicate with an additional issue on one collector; no concrete defect remained. Root visually reviewed the revised name row, grouped continuation and actual owned business-letter PDF. A verified copy of 56 fictional PDF/PNG/JSON review artifacts is retained under the ignored `accelerated-launch/service/out/bureau-form-review/writer-proof/` directory. Both writer commits were reviewed and integrated serially; the managed writer worktree is now recoverably archived.

## Evidence and release

The final affected run completed seven sections with **681 passing behavioral assertions**, zero behavioral failures/skips. Its source-custody gate recorded **one failure** because root regenerated the release manifest before that focused run finished. This run is not release proof. The generated manifest covers **125 shipped files**, digest **80731CA9BD1D42902860CDFAF8C7BD6B6FB84965144F8BCABA3C64BDE757EFCF**. The complete frozen suite is now running against that inventory. Earlier passing runs are not substituted for this candidate.

Final frozen regression and staging release evidence will be recorded here when completed. Independent production current-layout coverage, capacity, restore/cutover and live-billing gates remain open.

The first full frozen run measured **13,231 passed / 3 failed / 0 skipped**, zero source drift and zero unrun sections. It is retained as failed evidence. BU reused a fictional England profile for a Canadian TransUnion case; its fixture now explicitly saves Canada/Ontario through the real profile endpoint. CD and CR still required the old "rectify"/"verify" strings; their expectations now check the plain correction request and its specific last-payment/six-year reporting-period substance. No runtime gate was weakened. These three repaired sections passed **268/0/0**, and a new complete frozen run is required and underway.

### Final frozen implementation gate

The corrected complete run passed **13,236 / 0 / 0**, all **145 sections completed**, **254 current source hashes matching**, zero drift/unrun sections and **17/17 re-derived closure records**. Process exit **0**. Section execution took **1,342,639 ms**; the full runner including evidence reapplication took **1,434,375 ms**. This passing result supersedes the earlier failed/pending implementation snapshots. Original source PDFs, native fields/options, meaningful boundaries, owned actual previews, approval invalidation, reviewed-to-downloaded byte identity and the browser wizard are included. The exact 125-file candidate is prepared for staging; deployment is not yet claimed.
