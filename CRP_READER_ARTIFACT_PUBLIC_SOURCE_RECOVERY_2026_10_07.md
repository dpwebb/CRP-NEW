# Artifact and public-source reader recovery — October 7, 2026

Batch 56 uses the owner's supplied synthetic specimens to reproduce missed physical card fields, and a fresh primary-source search to support their meanings and ready shared mappings. Active assessment remains the 19-item common-error checklist across the 82 promised jurisdictions; consumer breach wording is **VIOLATION**. Implementation, hosted acceptance and production readiness remain separate.

## Source review

| Source | Useful evidence and boundary |
|---|---|
| Owner CA-TOR-0001, US-MD-0001 and UK-LDN-0001 PDFs | Explicitly synthetic native-text, four-column account cards. They reproduce missing own identifiers/payment dates and account association problems. Physical source controls are tested; they do not prove admission for a real bureau family. History lacks individual calendar dates/end anchors and remains undated. |
| Owner NZ-AKL-0001 PDF | Synthetic reference only. New Zealand is outside the approved 82; this artifact does not establish Australian support. |
| [TransUnion US consumer sample](https://www.transunion.com/how-to-read-your-credit-report) | Current publisher HTML contains explicit last-payment information, own year/month Rating rows and its own ratings key. Original-delinquency and actual closure dates are not populated. The retained capture is normalized web-reader text, SHA-256 `e81e07130a8beb102cbe617b998bfffb85edff8126ca35bd9e953dd686242dbb`; it is neither original HTML nor a rendered PDF. It supports shared row grammar/semantics; no distinct TU PDF admission is claimed. |
| [TransUnion UK credit-file guide v9](https://www.transunion.co.uk/content/dam/transunion/gb/consumer/collateral/your-credit-file-explained-v-9/Your%20credit%20file%20explained%20v9.pdf) | Publisher guide, copyright 2025, SHARE p16 and MODA p26. Supports exact account suffix, start/end date and latest-balance caption meanings. Borrower participation end, scheduled payment start, reporting-update dates and overdue-payment counts retain distinct meanings. Reviewed through the web PDF reader; direct capture was blocked, so no original-PDF hash is claimed. |
| [Equifax Canada consumer guide](https://assets.equifax.com/assets/canada/english/consumer_credit_report_user_guide.pdf) | A different compact consumer-file layout supplies account captions but sample dates are placeholders. Lost/stolen card status does not supply lifecycle status. Captured original guide SHA-256 `928201c983d54ba2100f9515f62273a00d02f3b3f36f3b32aa0fe71e16ba98a5`; PDF metadata dates to 2017. No new accepted-family defect or populated delinquency-date example was established. |
| [TransUnion Canada disclosure help](https://ocs.transunion.ca/secureocs/#/consumer-disclosure-help) | Confirms date and payment-rating semantics without supplying missing identifiers/current lifecycle or populating accepted blank dates. Historical narratives and product types are not current status. |
| [Equifax Australia MCF sample](https://www.equifax.com.au/sites/default/files/Sample%20report_MCF%20updated_Mar17.pdf) | Liability, update, overdue and enquiry sections reuse account-reference tokens, including conflicting account types. Supports a printed account locator; it does not establish continuing-account identity. Limits and principal roles do not supply current debt or sole/joint responsibility. |
| [CreditSmart report-detail guide](https://www.creditsmart.org.au/learn-about-credit/whats-in-a-credit-report) | Standard consumer liability information includes credit limits and excludes actual balance owed. A missing balance in that section is not repaired by turning a limit into debt. |

Canadian official sample links reached through FCAC now return 404. The US Equifax OneView guide is lender-facing and uses date placeholders; neither justifies consumer-family admission. Source retrieval was public-only; private reports stayed local.

## Implementation and verification

The coordinator integrated the isolated AU reference, rating-grid and card writers serially as `1f3cf73`, `56dcf0c` and `91a143d`. All three clean managed worktrees are archived with recoverable snapshots. Own card caption/value boxes now support shared masked identity, status, responsibility, amounts and dates. Unlabelled headings retain actual heading evidence without a fictional printed creditor caption. Explicit blank date symbols remain distinct from unread or missing value geometry. Summaries, addresses, employers, financial associates and explanatory prose no longer create the demonstrated false records.

Explicit Responsibility and Ownership retain their separate meanings; the exact consumer-role source wins over broad matching when both normalize to the same value. True heading/detail status conflicts remain unresolved. Malformed, untrusted, duplicate, neighboring and cross-page values are controlled.

The positioned grid reads its own Category/Rating rows, year and local printed key. The source-linked rule includes separate cell, printed-key and period facts; packets identify the actual captions and bind code/month/year/key locations. Removing or changing the key, caption, year, meaning or trust invalidates approval. Equivalent repeated key casing remains usable; genuine conflicting meanings remain rejected. Historical adverse/cure evidence reuses these same source checks.

AU findings and packets now retain the selected record's own trusted account reference as optional supporting evidence. Reference value, geometry, trust and privacy changes require fresh approval. References do not create an issue, resolve ownership or unlock identity/re-aging. The public projection preserves the reader's privacy flag.

### Supplied specimen measurement after integration

| Synthetic specimen | Own cards with mask/balance/past-due/role | Resolved status | Resolved last payment | Ambiguous last payment | Resolved closure | Explicit blank closure | Ambiguous closure |
|---|---:|---:|---:|---:|---:|---:|---:|
| CA-TOR-0001 | 7 | 6 | 7 | 0 | 2 | 5 | 0 |
| US-MD-0001 | 9 | 8 | 6 | 3 | 1 | 6 | 2 |
| UK-LDN-0001 | 6 | 6 | 4 | 2 | 0 | 5 | 1 |

All 22 own closure captions and 22 payment readings remain retained with their proper resolved/blank/ambiguous states. These files supply no original-delinquency dates or calendar anchors for their history strings. Root independently re-read all three files after serial integration and again after the continuation-boundary repair; counts are unchanged. Total records are 11/12/9, including legitimate non-card entries, and all three synthetic files produce zero active violations. Meaningful generated positive controls reach **VIOLATION**, owned earlier/current comparison and approved packet downloads across representative CA/US/GB/AU paths. The stored measurement is `accelerated-launch/service/out/b56-owner-artifact-probe.json` (ignored local evidence).

Focused integrated evidence: DS 124 and DL 104 pass; own key/grid AN/DN/DT/DG integration passes 587 assertions; AU DV/DM/DI passes 412; DU and general Z pass 208.

The first full run measured 10,584 passed, 1 failed, 0 skipped, with no source drift or unrun sections. It exposed a repeated same-bureau header splitting an explicitly continued account. The existing report segmenter already distinguishes continuing reports from another bureau/date; account assembly now preserves a same-bureau continuation while retaining changed-bureau and physical-card resets. Added assertions verify the account's closure and actual page-2 source. AK/DS/DU/DL/Z passed 478 assertions after this repair. The first full result remains retained locally as `accelerated-launch/service/out/b56-first-full-regression-evidence.json` and `b56-frozen-full.log`; it is not completion evidence.

**Corrected final frozen current-product regression:** 10,587 passed, 0 failed, 0 skipped; 123 completed sections; no unrun sections; source drift []. All 208 post-run tested-source hashes still match. All 17/17 closure records were re-derived from that successful run. Maintained common-error evidence derives 4,725 measured assertions across 27 sections, retains the 19-item checklist and limits implementation closure to SUPPORTED_PATHS_ONLY. Shared all-82 loops, owned re-aging, accepted readers and real browser Wizzard acceptance pass alongside the new representative upload-to-approved-packet paths.

Separate final source audit: 23 passed, 0 failed, 0 skipped on unchanged corrected source; focused evidence remains separate from release evidence. All 92 shipped file hashes and group/composite manifest digests match. The corrected manifest digest is `306762721E405D805A35FE6C2C5C7AE049BD8F8F13348DA4351A0980961E1194`. Final read-only hash/count verification is retained in `accelerated-launch/service/out/b56-final-freeze-verification.json` (ignored local evidence).

## Remaining source dependencies

| Area | Remaining source dependency |
|---|---|
| Canada accepted reports | TU PR-02 still omits own masked identity/current status and leaves three first-delinquency fields blank. Equifax collection status and ordinary original-delinquency dates are not printed. The synthetic CA cards now retain their own supported fields; one genuinely conflicting status stays unresolved. |
| US accepted report | PUB-001 still lacks original-delinquency, last-payment and closure captions; 33 history cells remain unresolved after the Batch 55 recovery. The supplied synthetic US cards retain printed payment/closure readings, including three ambiguous payment dates and two ambiguous closure dates. Own-dated Rating grids are now supported, but undated synthetic history strings remain undated. |
| UK accepted report | PUB-009 settled/default history periods, masked identity, numeric past-due and delinquency/payment dates remain unsupported by that report. The supplied synthetic UK cards recover printed identifiers/amounts/roles; two ambiguous payment dates, one ambiguous closure date and undated history strings remain unresolved. |
| Australia accepted report | YCAI still lacks current balance/past-due, corroborated masked identity, explicit sole/joint responsibility and original-delinquency/payment dates. Its own printed references now accompany supported issues and packets; the MCF example does not populate absent YCAI facts or admit a new family. |

Absent original-delinquency/payment/closure dates, unknown history periods or meanings, unreadable cells and unclear responsibility remain absent or unresolved. A guide or another account cannot populate them. All demonstrated ready mappings from this review are integrated and tested. These boundaries do not suppress independently supported violations or packets. No deployment or live billing change occurred in this batch.

**Supported local implementation tested; staging verification PENDING; production readiness OPEN.** Core reader/finding coverage, all-82 facilitation and consumer packet obligations remain open for substantive unfinished source mappings and hosted acceptance. Synthetic behavioral proof does not certify a real bureau family or every checklist item on every layout.
