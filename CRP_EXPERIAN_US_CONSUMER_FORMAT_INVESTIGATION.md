# CRP Experian US Consumer-Format Investigation

Research date: September 30, 2026 (America/Halifax). Retrieval timestamps are recorded separately in UTC.

Status: **PUBLIC-SOURCE FORMAT INVESTIGATION / NOT AN ADMISSION.** This document is not a Corpus Contract, not an admitted report presentation, not a parser or evaluator specification, not rule admission, not a legal finding, and not a declaration that Gate 5.3 passed. It does not amend the public format baseline, the readiness plan, the legal sources, or any register.

## 1. Question, inputs and boundary

The owner asked whether an **official public Experian US consumer-disclosure artifact** can establish the account-level medical-debt representation needed for the single `US-NY` candidate `CRP-LSRC-0194`, and asked for the answer to be documented without building anything.

Inputs read before research: `CRP_PUBLIC_REPORT_FORMAT_BASELINE_2026-09-30.md`; the baseline evidence package `SOURCE_CAPTURES\REPORT_FORMAT_BASELINE_2026-09-30\` (manifests, inventory, originals, derivatives, marker locator); `CRP_PROD_001_READINESS_AND_IMPLEMENTATION_PLAN.md`; `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md`; `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md`; `CRP-DISC-002C-NY-0194.md`; `CRP_CORE_CONSTITUTION.md`; `CRP_LEGAL_INVARIANT.md`. No `AGENTS.md` file exists anywhere in the workspace (searched, including hidden paths), so no additional repository instructions applied.

Authorized by this task: public-source research and documentation only. Not authorized and not performed: parser or evaluator implementation, legal-rule admission, website changes, deployment, private report retrieval, consumer-data transmission, or any change to an existing artifact. Experian was selected as a bounded first format investigation; that selection is **not** production support and **not** authorization for a different report-input channel.

Out of scope by instruction: re-reviewing accepted legal decisions, and resolving statutory timing, preemption, exception or applicability questions. No legal reporting period, medical-debt threshold or statutory deadline observed in any retrieved page was recorded as an admitted rule or finding.

## 2. Preservation and verification of the existing baseline

Before new research, the baseline package was verified in place, read-only:

1. **Inventory and hashes.** All 38 files present in `SOURCE_CAPTURES\REPORT_FORMAT_BASELINE_2026-09-30\` were hashed locally and compared with `INVENTORY.md` and `file_custody_manifest.json`. Every listed hash matched. The custody manifest excludes itself, so its own file digest is recorded here for completeness: `f59f4c24b823b983315c3fc71197e518b20938502620595557a253e345143569` (5,830 bytes).
2. **Automated re-verification.** `build_investigation_index.py` re-hashes every file listed in the baseline custody manifest and asserts equality. Result: **PASS — no baseline file changed** during this investigation.
3. **Record qualifications retained.** The baseline's classifications were not rewritten: PUB-001 is a consumer educational sample; PUB-021 is a subscriber eSolutions sample; PUB-008 is an archive interstitial; PUB-026 is HTML returned for an expected PDF; nine baseline routes failed retrieval.
4. **PUB-001 and PUB-021 kept distinct.** PUB-001 is a consumer-channel artifact dated June 30, 2015 (`601c2387b62a1a8f1425ffffcdc80a1e64ce1de0c8b1d662922350cd1f0dec01`, 5,845,994 bytes, one page 954 × 5669 points, zero pages with native text). PUB-021 is a subscriber-channel artifact displaying 11/28/2008 (`71495c1121850b60a84e51b303e52f24caab9b1e0351661ef9ba4f855389ccb7`, 33,595 bytes, three pages 612 × 792 points, three pages with native text). They are never merged, and the subscriber sample is never used as a substitute for a consumer disclosure.
5. **Baseline original route re-checked.** The PUB-001 source route was requested three times with different request headers (`recheck_baseline_original.py`; results in `baseline_original_recheck.json`):
   - plain request → HTTP 200, `text/html`, 6,183 bytes, page title **"Pardon Our Interruption"** — a bot-mitigation interstitial, not an artifact;
   - browser-like request (accept, language and referer headers) → HTTP 200, `application/pdf`, 5,845,994 bytes, SHA-256 `601c2387b62a1a8f1425ffffcdc80a1e64ce1de0c8b1d662922350cd1f0dec01` — **byte-identical to the pinned original**;
   - compressed/no-cache request → HTML, 5,245,164 bytes, not a PDF.
   - Verdict: `BYTE_IDENTICAL_TO_PINNED_ORIGINAL`. The temporary download used for hashing was deleted; no second copy was retained. **Reproducibility caveat:** a browser-like request is required, and non-browser requests to the same route are served an access interstitial. The artifact remains exactly as pinned; nothing was overwritten.
6. **Subscriber marker locator independently re-verified.** PUB-021 page 2 was re-rendered from the pinned original at 300 DPI (`PUB-021-page2-marker-crop.png`, clip 20,480–612,665 pt). The marker line, the enclosing collection account block and the two legend lines below it were confirmed. The baseline locator data was neither amended nor re-derived; only its reproducibility was tested.

## 3. New evidence package and what each route actually returned

New directory: `SOURCE_CAPTURES\EXPERIAN_US_CONSUMER_FORMAT_INVESTIGATION\` (new files only). It contains `source_inventory.json`, `capture_experian_sources.py`, `capture_manifest.json`, `reviewed_manifest.json`, `INVENTORY.md`, `file_custody_manifest.json`, the captured bodies and text derivatives, the search-index captures, the inspection renders plus `render_inspection.json`, the authored observation records, `recheck_baseline_original.py` and `baseline_original_recheck.json`, `render_inspection.py`, `capture_search_index_observations.py` and `search_index_manifest.json`, and `build_investigation_index.py`.

All bodies in this package were retrieved on 2026-09-30 between 14:13:01Z and 14:15:05Z; the three baseline-route re-check requests ran at 14:14:14Z, 14:14:30Z and 14:14:46Z. Per-record retrieval times, media types, byte counts and hashes are in `capture_manifest.json`, `search_index_manifest.json`, `baseline_original_recheck.json` and `render_inspection.json`.

| ID | Publisher / artifact | Route result | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| EXP-001 | Experian, Ask Experian article "What's Not Included in Your Credit Report?" — contains the literal marker and the official display statement | CAPTURED_HTML; HTTP 200; article body confirmed (title, canonical URL, structured data) | 225,046 | `921073a5276ebcbade0c73fcead2f4038f8d965e152c007dcfd14da951adfa13` |
| EXP-002 | Experian, retired article "Contact Information for Medical Collection Accounts" (indexed as May 8, 2018) | RETRIEVAL_FAILED; Experian Page Not Found shell | — | NOT_CAPTURED |
| EXP-003 | Experian, current article "How Does Medical Debt Affect Your Credit Score?" | CAPTURED_HTML; HTTP 200 | 267,890 | `cb91c282070ba92ff92fb657c9568c213ab2aec5b7befd2095795a016942270c` |
| EXP-004 | Experian, current article "Can Medical Bills Hurt Your Credit Report?" | CAPTURED_HTML; HTTP 200 | 223,277 | `61f287809c5d2b2548e0b955cb7b5e4472286f4e4ed541aede7867dc86efb402` |
| EXP-005 | Experian, current article "What Happens When Medical Bills Go To Collections?" | CAPTURED_HTML; HTTP 200 | 219,470 | `3966a74e57131c495268ad115c2f523a0b993476a965d0ffc0399d1dafcee3fb` |
| EXP-006 | Experian, screening-services "Credit Profile Report and Score" sample (third-party/recipient presentation) on the non-production host `stg1.experian.com` | CAPTURED_PDF; HTTP 200; one page 612 × 792 pt; **zero native text** | 87,888 | `8c5a0fbf08726be7564a9f6692cf2d15e9cb327f4defeea9dc0b72bc5a31da56` |
| EXP-007 | Candidate consumer-sample route `experian.com/assets/consumer-information/connect/includes/sample-credit-report.pdf` | **INTERSTITIAL_HTML_NOT_ARTIFACT** ("Pardon Our Interruption"), not the requested PDF | 6,183 | `9cb43c6600ad54d08edef00de87dc6e3bcde9761a996df6e09ca801ce37df7a5` |
| EXP-008 | Re-verification of the baseline PUB-001 route | Handled separately by `recheck_baseline_original.py` (see §2, item 5) | 5,845,994 | `601c2387b62a1a8f1425ffffcdc80a1e64ce1de0c8b1d662922350cd1f0dec01` |

Every response was checked for being the intended artifact rather than an error page, redirect or interstitial. EXP-002 returned Experian's generic Page Not Found shell (`data-op="EXP-ERR-PRI"`, 253,442 bytes for that path, matching the shell served for other non-existent routes tested in the same form); EXP-007 returned a bot-mitigation interstitial. Neither is treated as evidence, and neither is called a captured original.

Additional retrieval limits met during this investigation, recorded rather than hidden:

- **Internet Archive was unavailable.** `archive.org/wayback/available` returned HTTP 429 and the CDX and replay endpoints returned "Internet Archive services are temporarily offline". No archive-channel evidence was relied upon.
- **Search-engine index re-capture was rate-limited.** The reproducible capture of the index pages used for `search_index_observations.json` returned HTTP 429 (`search_index_manifest.json`, SI-001 and SI-002). The index text in that file is therefore recorded with the limitation stated in the file itself.
- **Routes expected to exist but not found:** the article "Understanding Your Experian Credit Report" (indexed as June 10, 2024) could not be resolved to a live canonical route; the tested path returned the Page Not Found shell.

## 4. The consumer presentation that is actually evidenced

### 4.1 Artifact and structure

The only official public Experian **consumer** artifact located remains the baseline's PUB-001, inspected here in documented vertical slices (`PUB-001-slice-01.png` … `PUB-001-slice-09.png`, plus the targeted crop `PUB-001-important-messages.png`; clip boxes, DPI and hashes in `render_inspection.json`; structured record in `consumer_presentation_observations.json`).

Observed presentation order: header band (consumer name, report number `0956-2654-65`, June 30, 2015, Print report, Logout); navigation tabs (Personal information; Personal statements; Potentially negative items; Accounts in good standing; Credit inquiries; Important messages; Dispute Cart); a sample disclaimer ("…provided to you for education purposes only in connection with your Experian Credit Educator services…"); a contact band; **Personal Information**; **Your personal statements**; **Potentially negative items**; **Accounts in good standing**; **Credit inquiries**; **Important messages**; **Know your rights**; and a state-by-state **Notification of Rights** link list that includes a New York entry.

### 4.2 Account blocks present, and the marker that is not there

Three account blocks appear in the whole artifact: `123 CREDIT CARDS` (Potentially negative items; $273 as of 06/03/2015; opened 11/2013; Open; credit card; revolving; individual), `HOMETOWN AUTO` (Accounts in good standing; $11,616; opened 03/2013; Current; auto; 60 months), and `AMERICAN APARTMENTS` (Accounts in good standing; $4,000; opened 10/2014; Inactive/Never late; rental; 12 months). Public records are explicitly stated as absent ("No Public Records appear on your report.").

**No account block in this consumer artifact carries a medical marker, a medical collection, or a medical provider as an original creditor, and the label "Original creditor" does not appear in its account blocks.** The artifact therefore cannot evidence an account-level medical representation in the consumer presentation.

### 4.3 The one medical statement the consumer artifact does contain

Located by documented visual inspection at page index 0, clip `0,3170 – 954,3345` pt, in the section **Important messages** (`PUB-001-important-messages.png`, 300 DPI), verbatim:

> Experian collects and organizes information about you and your credit history from public records, your creditors and other reliable sources. By law, we cannot disclose certain medical information (relating to physical, mental, or behavioral health or condition). Although we do not generally collect such information, it could appear in the name of a data furnisher (i.e., "Cancer Center") that reports your payment history to us. If so, those names display in your report, but in reports to others they display only as "Medical Information Provider." Consumer statements included on your report at your request that contain medical information are disclosed to others.

Two properties of this statement matter for the mapping question. It is **file-level**, not attached to any account block, so it is not an account-level representation. And it is the publisher's own sentence inside a consumer-facing artifact saying that the medical substitute wording is what **reports to others** display, while **the consumer's own report displays the furnisher name**.

### 4.4 Limitations of this consumer evidence

The artifact is a single 2015 educational sample; it is image-only, so every quote above is a documented **visual** observation and not native text (0 characters were extracted from it by pdfplumber and, independently here, by PyMuPDF); no OCR was performed or validated; a single sample cannot establish a report family, mandatory fields or current practice; and the sample contains no medical collection account at all. Version date, retrieval date and copyright date remain separate properties and are not conflated.

## 5. The literal "Medical Payment Data" marker: what is evidenced, and where

### 5.1 The account-level marker is evidenced only in a subscriber artifact

| Property | Verified value |
| --- | --- |
| Artifact | PUB-021, `SOURCE_CAPTURES\REPORT_FORMAT_BASELINE_2026-09-30\PUB-021.pdf`, SHA-256 `71495c1121850b60a84e51b303e52f24caab9b1e0351661ef9ba4f855389ccb7` |
| Publisher / product / channel | Experian / eSolutions U.S. Credit Profile Report / **subscriber** |
| Displayed date | 11/28/2008 – 11:41:56 AM (display date, not a legal effective period) |
| Locator | PDF page index 1 (displayed page 2), 612 × 792 pt; section path Trades → Installment Accounts; block header `*Credit and Collection / 3980999 / YC – Other collection agencies` |
| Field and raw value | `Original creditor:` → `Medical Payment Data` |
| Whole-line bounding box | x0 = 38.82, top = 585.87152, x1 = 163.1307, bottom = 592.05152 pt (x from left, top from upper page edge) |
| Native-text state | `VALUE_PRESENT`; reproducible with the inspection extractor |
| Enclosing block | Collection account; original amount $1,590; current balance $1,590; status date 11/01/2003; account # 98E543182136; responsibility Individual; delinquency counter Derog 28; worst delinquency "Collections" |
| Following lines | `Account information disputed by consumer**` and `** Debt being paid through insurance **` |
| Reproduction check | Re-rendered at 300 DPI from the pinned original during this investigation (`PUB-021-page2-marker-crop.png`) — marker line and enclosing block confirmed |
| Normalization | NONE; the raw marker is not a certified debt-type determination |

The insurance legend is recorded as displayed text only. It is **not** used here to infer medical debt, and this subscriber presentation is not equated with any consumer disclosure.

### 5.2 Official documentation that characterizes the marker

Three official Experian statements were located, in different evidence classes.

**(a) Captured, verifiable official page — EXP-001.** `https://www.experian.com/blogs/ask-experian/what-is-not-included-in-your-credit-report/` ("What's Not Included in Your Credit Report?", section heading *Medical Information*), captured body `EXP-001.html` (225,046 bytes, SHA-256 in §3), verbatim from the captured text derivative:

> By law, credit bureaus including Experian cannot disclose medical information relating to physical, mental or behavioral health. And while Experian does not collect or display medical information as part of your credit history, you may see the name of a medical provider listed as the original creditor on a collection account (such as "Cancer Center"). Although you can see the name of the original creditor that the collection debt was purchased from, it will display to your lenders and others viewing your credit report simply as "medical payment data."

The page's structured data records `datePublished` and `dateModified` as 2026-09-28 while the search index shows the article as dated April 10, 2021; both are recorded, and neither is treated as a legal effective period. The same page also lists retention periods for other item types; those were not recorded, used or admitted as rules.

**(b) Search-index observation only — `search_index_observations.json`.** The retired Experian article "Contact Information for Medical Collection Accounts" (indexed as May 8, 2018) is no longer served: the route returns the Page Not Found shell (EXP-002) and no body was obtained. Its indexed text was observed during this session and reads, in the index's own words:

> Medical collection accounts can be part of a credit report. However, for privacy reasons information that identifies the specific illness, type of treatment or the service provider is blocked from the credit reports provided to lenders or other [businesses]. Therefore, if you are looking at a lender's credit report, you will not see the name of the medical office or provider. If you are looking at a copy of your personal Experian credit report, the collection account will show the original creditor's name and any available contact information for the collection agency.

This is an index snippet, not a bureau artifact, and the reproducible re-capture of the index page was rate-limited (HTTP 429). It is recorded as observed text with that limitation attached and is not treated as a pinned official source.

**(c) The consumer artifact's own sentence — §4.3.** Inside a consumer-facing Experian disclosure, the substitute wording for reports to others is given as "Medical Information Provider".

### 5.3 Marker wording is version- and channel-specific

| Evidence | Era | Literal wording | Who sees it, per the source |
| --- | --- | --- | --- |
| PUB-021 subscriber sample | 2008 | `Medical Payment Data` | Subscriber/recipient presentation (raw value inside an account block) |
| PUB-001 consumer sample, Important messages | 2015 | `Medical Information Provider` | "in reports to others they display only as…" |
| EXP-001 official article | 2021 index / 2026-09-28 structured date | `medical payment data` | "…to your lenders and others viewing your credit report" |

No equivalence between these strings is established, and no official dictionary mapping the marker to a product version, a recipient class or a mandatory field was obtained.

### 5.4 Separate-channel artifacts inspected and not treated as the marker's evidence

`EXP-006` is an Experian "Credit Profile Report and Score" sample displaying 07/27/2009, addressed to a third party, with the actions `PDF | Print | Edit Inquiry` — a recipient-side presentation. Its trades are loans, retail and bankcard accounts, and its inquiries include collection agencies ("CLIENT SERVICES INC … Other Collection Agencies", "PIONEER CREDIT RECOVER … Other Collection Agencies"). It contains **no** medical marker; it is recorded as a separately classified third-party presentation showing no medical collection, and therefore neither supports nor contradicts the marker's meaning. It is also image-only (zero native text) and is served from a non-production Experian host (`stg1.experian.com`), which is itself a reproducibility limitation.

## 6. The five required determinations

| # | Determination | Result | Basis |
| --- | --- | --- | --- |
| 1 | Is the exact consumer presentation evidenced? | **PARTIAL** | One official consumer artifact is pinned, hashed and inspected (PUB-001, June 30, 2015), but it is an educational sample, image-only, and not a current production disclosure |
| 2 | Is an account-level medical marker present in a consumer presentation? | **NOT ESTABLISHED** | No account block in PUB-001 carries a medical marker; the only consumer-side medical text is file-level boilerplate; the account-level marker is evidenced only in the subscriber artifact PUB-021 |
| 3 | Does official documentation establish its meaning? | **PARTIAL** | Two official Experian statements describe the marker as the display used in reports to lenders/others while the consumer's own report shows the provider/furnisher name; no official field/value reference defining the marker was obtained, and no source states that a consumer disclosure contains the literal string |
| 4 | Is the locator reproducible? | **YES for the subscriber marker; NO native-text locator for the consumer text** | PUB-021's marker reproduces from the pinned original with page, section, block, field, raw value, exact coordinates and a fresh render; PUB-001 carries zero native text, so its medical sentence has a documented visual locator only |
| 5 | Is the evidence sufficient for the required report-representation mapping? | **NO** | The required representation is an explicit bureau label or description identifying the item as medical debt in the report being mapped; no consumer-disclosure artifact evidencing that at account level was located, and the official statements place the substitute wording on the recipients' side |

## 7. The precise gap

**What is missing is an artifact, not an argument.** The missing artifact is one of the following, and nothing here substitutes for it:

1. A byte-pinned **official Experian US consumer disclosure** (current or, failing that, of a known vintage) that displays, **inside an account block**, an explicit marker or description identifying the item as medical debt, together with its exact section path, enclosing record, field label, raw value and reproducible locator; or
2. An **official Experian field/value reference** (product guide, reference guide or code dictionary) that documents such a consumer-facing display for the product and recipient class being mapped.

Three narrower gaps follow from the evidence above and should not be conflated with it:

- **Channel gap.** The only account-level marker that exists in public evidence is in a **subscriber** artifact from 2008. The two official statements that describe the marker both attach it to what *lenders and others* see, while saying the consumer's own report shows the provider/furnisher name. The consumer equivalent is therefore unresolved, not merely unfound.
- **Wording gap.** The literal strings differ by era and channel (`Medical Payment Data` 2008 subscriber; `Medical Information Provider` 2015 consumer boilerplate; `medical payment data` in the current consumer article). No equivalence and no version mapping were established.
- **Extraction gap.** The only pinned consumer artifact is image-only (zero native text under two independent extractors). Even its file-level medical sentence has a **visual** locator only, so it could not seed a native-text locator without either a text-bearing artifact or an owner-authorized OCR/inspection regime.

**One question must go to the owner and is not resolved here:** whether a furnisher or provider name that a consumer's own report displays (the construction both official statements describe) can satisfy that candidate's required report representation. That is a mapping/legal determination for the owner, not a format observation, and no attempt is made in this document to answer it. Consistent with the baseline and the readiness plan, the subscriber marker must not be copied into the consumer mapping, the legal unit must not be broadened, no sample may be invented, and Gate 5.3 must not be claimed.

## 8. Unresolved questions

| # | Question | Status |
| --- | --- | --- |
| Q-1 | What is the live canonical route of Experian's current consumer-facing explanation of its own report layout ("Understanding Your Experian Credit Report", indexed 2024-06-10)? | Unresolved; route not located |
| Q-2 | Is there a currently served official public Experian US consumer disclosure sample? The historical route is dead (PUB-019) and the `/assets/consumer-information/connect/…` route is blocked by bot mitigation (EXP-007) | Unresolved |
| Q-3 | Does a current consumer disclosure display an account-level medical marker at all, and in what literal form? | Unresolved; no artifact |
| Q-4 | Which product, version and recipient class each marker string belongs to, and whether any official dictionary defines them | Unresolved; no official field/value reference obtained |
| Q-5 | Was the 2018 Experian article's display rule superseded, and by what text? Its own page is no longer served and no archive was reachable | Unresolved; Internet Archive offline at retrieval time |
| Q-6 | How must official public artifacts be captured when the publisher serves interstitials and rate limits non-browser clients (PUB-001 needed browser-like headers; the index re-capture was HTTP 429)? | Open implementation question for the owner; no capture convention is asserted here |
| Q-7 | Does the owner want the consumer-presentation requirement met by a different bureau's consumer artifact, or by an authorized non-public channel? | Owner decision required; not inferred here |

## 9. Recommendation and the exact next authorized documentation step

**Recommendation: do not proceed to a report-representation mapping work order on this evidence.** The Experian investigation did not produce the artifact the mapping requires. It produced something narrower and still useful: a verified account-level subscriber locator, two official Experian statements that characterize the marker's audience, confirmation that the pinned consumer artifact contains no account-level medical representation, and confirmation that the pinned artifacts are intact.

Ranked options for the owner:

1. **Recommended — issue a bounded follow-on documentation order** limited to locating one of the two artifacts in §7, keeping the `US-NY` × `CRP-LSRC-0194` unit unchanged and keeping the ceiling at `PROBABLE_VIOLATION`. A suitable order would search official Experian consumer-report routes and public product/reference documentation for an account-level medical marker, re-attempt the blocked routes when the publisher's mitigation permits, re-attempt the Internet Archive, and re-attempt the index captures — and would stop, reporting the gap, if the artifact is still absent. It must not be turned into a parser task, a rule-admission task or a finding task.
2. **Alternative — do not spend further public research on Experian** and keep the `US-NY` candidate at `PROBABLE_CANDIDATE` with its report representation explicitly `UNRESOLVED`, recording this investigation as the reason.
3. **Owner decision if any of the above changes** — if the owner considers the recipient-side construction described by Experian's own statements sufficient for the candidate, or wishes to admit a different input channel, that is an explicit owner determination. Neither may be inferred from this document, and neither may be introduced by a later work order as a technical assumption.

**Exact next authorized documentation step (whichever option the owner chooses):** the owner issues the bounded follow-on work order described in option 1, or explicitly records option 2 or 3 as a decision. Until then the correct action is **none**: no mapped representation, no `PHASE5-001I` work order, no rule admission, no code, no website change. Milestone **M-1 remains pending** and Gate 5.3 is **not** passed.

## 10. Verification, files, and boundary statement

**Verification performed.**

- Every hash in this investigation's manifests was recomputed from disk by `build_investigation_index.py` and asserted; the script also re-hashes the entire baseline package against its own custody manifest and aborts on any difference. Result: **baseline unchanged, PASS**.
- The captured article bodies were checked for being the intended artifact (page title, canonical URL, structured data, presence of the expected text) rather than an error shell or interstitial; the two non-artifact responses are classified as such in the manifests.
- All inspection renders were produced from hash-verified pinned originals and are themselves hashed in `render_inspection.json`.
- Native-text availability was independently re-tested: PUB-001 and EXP-006 are image-only (zero characters under two extractors).

**Files created by this investigation (nothing else was created, and no existing file was modified).**

- `CRP_EXPERIAN_US_CONSUMER_FORMAT_INVESTIGATION.md` (this document).
- `SOURCE_CAPTURES\EXPERIAN_US_CONSUMER_FORMAT_INVESTIGATION\` containing: `source_inventory.json`, `capture_experian_sources.py`, `capture_manifest.json`, `reviewed_manifest.json`, `INVENTORY.md`, `file_custody_manifest.json`, `EXP-001.html/.txt`, `EXP-003.html/.txt`, `EXP-004.html/.txt`, `EXP-005.html/.txt`, `EXP-006.pdf/.txt`, `EXP-007.html/.txt`, `recheck_baseline_original.py`, `baseline_original_recheck.json`, `render_inspection.py`, `render_inspection.json`, `PUB-001-slice-01…09.png`, `PUB-001-important-messages.png`, `PUB-021-page2-marker-crop.png`, `EXP-006-screening-sample-full.png`, `capture_search_index_observations.py`, `search_index_manifest.json`, `SI-001-brave.html`, `SI-002-brave.html`, `search_index_observations.json`, `PUB-021-marker-context-observation.json`, `consumer_presentation_observations.json`, `build_investigation_index.py`.

**Boundary statement.** No parser, evaluator, website or deployment was changed. No consumer data was retrieved or transmitted. No private report or account was accessed; no service was purchased and no contact was made. No legal rule was admitted, no finding was produced, and no production support for any bureau, product or channel is claimed. The baseline, the readiness plan, the legal sources and the registers are unchanged, and the admitted-rule count, governed-jurisdiction coverage and permitted-findings count remain zero.
