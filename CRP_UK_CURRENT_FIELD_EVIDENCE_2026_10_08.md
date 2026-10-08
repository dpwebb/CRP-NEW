# UK current consumer field evidence — Batch 62

Date: October 8, 2026. Authority: owner requests to work on UK report evidence and finish the online search. Preserve all 82 jurisdictions, the active 19-check list, VIOLATION consumer wording and source/ownership/approval safeguards.

## Verified official consumer specification

[TransUnion Your credit file explained V9](https://www.transunion.co.uk/content/dam/transunion/gb/consumer/collateral/your-credit-file-explained-v-9/Your%20credit%20file%20explained%20v9.pdf) identifies itself as **V9.0 | April 2025**, copyright 2025, 55 pages. Section 5.8, printed pages 15–17, explicitly organizes consumer SHARE fields by Section / Field name / Details. The [V8 May 2024 guide](https://www.transunion.co.uk/content/dam/transunion/gb/consumer/collateral/your-credit-file-explained-2024-transunion.pdf), 53 pages, has matching relevant field meanings on pages 14–16. Batch 56B had already reviewed V9; this batch measures the supported captions against the reader and completes the usable slice.

| Printed caption | Supported use and boundary |
|---|---|
| Organisation Name | Own creditor identity and account boundary. |
| Account Number / suffix | Own masked suffix; preserve its source without retaining an unmasked number. |
| Account State | Recognized literal status; do not turn Normal into on-time or infer payment performance. |
| Account Type | Printed revolving/card type where recognized. |
| Current Balance | Own balance from the organisation's latest update. |
| Regular Payment Value | Scheduled amount due; never proof of payment received. |
| Credit Limit / Overdraft Limit | Own limit; a missing/N/A value never becomes zero. |
| Account Start Date / Account End Date | Account lifecycle dates; N/A supplies no invented date. |
| Account Holder Start Date / Account Holder End Date | Participation dates; excluded from account opening/closure. |
| Payment Start Date | Payments became due; excluded from last-payment/first-delinquency facts. |
| Date Account Last Updated | Organisation update; excluded from report reference date. |

The [current official Credit Report Basics page](https://www.transunion.co.uk/consumer/blog/credit-report-basics) now links `Your-credit-file-explained-Sep.pdf`. Its actual edition/content was **not verified**. V9 is the latest verified readable edition in this review, not a claim that V9 is today's latest linked edition.

Ordinary original-file requests for V8, V9 and the Sep link returned **HTTP 403**. The web PDF reader exposes V8/V9 content. No original PDF bytes/hash are claimed. `SOURCE_CAPTURES/GB-CURRENT-REPORT-2026-10-08/source-review.json` is the coordinator's structured field crosswalk, not original PDF or verbatim normalized full text; SHA-256 **39f772154833561cca09cc61850f196dd29a69c6a5b10203676f3e5062037d18**. The shipped `gb-general-field-contract.cjs` preserves the source URL/version/locators, field meanings and these boundaries.

## Other sources reviewed and their limits

- [Experian consumer report page](https://www.experian.co.uk/consumer/experian-credit-report.html): its actual public app previews show creditor category, balance, current standing and relative past payment problems. They show no own account identifier, absolute history month or report reference date. Current standing with an earlier missed payment is not a contradiction. No dedicated PDF layout or missing date is inferred from these images.
- [Experian CAIS V16 September 2025 specification](https://www.experian.co.uk/blogs/latest-thinking/wp-content/uploads/sites/13/2024/04/CAIS-2007-File-Spec.pdf), supported by the [September 1, 2025 update notice](https://www.experian.co.uk/cais/updates): lender-submission definitions, not consumer-report geometry. Existing supported Experian definitions remain independently pinned.
- [Credit Engine anonymous partner sample](https://www.creditengine.co.uk/sample-report/#financial-accounts): actually rendered and expanded. Its own rows show masked identifiers, start/payment-start/update dates and balances; the opened card shows a June 2019 update. A live partner page with historical rows does not prove a current bureau export. N/A limits and relative history are not invented facts.
- Current Equifax/TransUnion product, privacy and access pages explain fields/access, but supply no measured full current consumer export. Identity-verified report access was not requested. No enrollment, purchase, bureau correspondence or consumer-data transmission occurred.

## Demonstrated defects and bounded repair

Exact-caption baseline probes showed that Organisation Name was skipped, merging two account blocks; Account Start Date could contaminate creditor identity with START; Account State was skipped; and Regular Payment Value was unavailable. The existing general reader already supports suffix, balance and account/MODA date aliases. Repair these four omissions using shared caption/source mechanisms and preserve holder/payment-start/update-date exclusion.

Coordinator integration additionally measured the guide's complete Credit Limit / Overdraft Limit caption: a separate caption/value did not resolve the limit. The final bounded correction recognizes that exact caption and uses it in the native four-region packet proof, rather than substituting the shorter existing alias.

The existing zero-limit checklist violation also omitted an available own masked identifier from packet evidence. Include that optional supporting fact without adding a check prerequisite or changing the predicate. Verify the actual selected/reviewed/approved download uses its own account identity and source facts.

## Scope and evidence gate

`GB-TU-GENERAL-FIELDS-V9-2025` establishes only the supported **current GENERAL consumer field contract**. It does not certify a complete current bureau PDF geometry, populated specimen, TransUnion history interpretation or missing values. The historical Experian family remains separately admitted with both currency flags false and its 2007 specimen unchanged.

The existing `CURRENT_GB_SUPPORT_IS_ESTABLISHED` country gate must credit the bounded current contract only with a complete passing unchanged-source product run: relevant native/source-isolation checks and all four UK regions' actual approved zero-limit packet downloads. Missing/partial/stale/differently scoped proof keeps the gate open. No documentation-only closure or manual currency switch is accepted. Hosted paid acceptance and production readiness remain separate.

Status: research completed; supported current GENERAL field/packet implementation CLOSED; staging release recorded separately; production OPEN.

## Measured implementation

Isolated writer commit `411e2ad` was reviewed and integrated serially as `0baca78`; root completed the combined limit-caption correction, optional packet-source validation and complete evidence-inventory guards. No parallel checkout edits occurred. The writer's five expected packet-source integration failures were corrected by the coordinator before registered acceptance; they are not counted as passing.

Initial affected registered proof passed **597/0/0**. Final DL source/packet proof passed **224/0/0**, including each region's actual native upload, extraction, checklist violation, selection, correspondence review, approval and download with the own creditor, suffix, amounts and physical locations. Missing/untrusted optional masks preserve supported issue eligibility but do not enter evidence. Initial V diagnostic metadata failures were corrected; final V passed **127/0/0** and rejects partial, stale, mis-scoped or internally inconsistent proof.

The frozen final product run passed **11,549 assertions / 0 failures / 0 skips**, **130 completed sections**, **221 unchanged source hashes**, no unrun sections or drift, and **17/17 refreshed closure records** (886,806 ms). Separate historical source audit **23/0/0**. Current local UK country gate **PASS**, explicitly `CURRENT_GENERAL_CONSUMER_FIELDS`; the historical Experian family's currency remains false. Shipped manifest: **98 files**, SHA-256 `F0B8FC4E0F06D97A710A1DF38FBAFE1ECEE86A27F5FA32AD39DC59E2C89C8F0D`.

This is technical proof using explicitly fictional native behavioral reports against verified published field meanings. It is not a retrieved real current consumer report, whole-layout certificate, genuine hosted payment or production authorization. Source/failed/focused/final evidence is retained in ignored `service/out/staging-gb-2026-10-08/` and the source-review capture. The existing hosted paid checkout dependency and production release controls remain open.

Staging build **`crp-v1-f0b8fc4e0f06d97a`**, runtime **`3a5a35a41ae84447c0e14052114d8317411aa5c9`**, activated October 8 at **11:49:22 UTC**. Nine hosted free UK intake/assessment/ownership/payment-boundary checks and disposable-account cleanup pass. Paid hosted packet acceptance remains pending. Exact release/provenance/rollback: `CRP_STAGING_UK_FIELDS_DEPLOYMENT_2026_10_08.md`.
