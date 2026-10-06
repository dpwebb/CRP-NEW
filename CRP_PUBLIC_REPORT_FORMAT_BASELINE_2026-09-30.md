# CRP Public Credit Report Format Baseline

Research date: September 30, 2026 (America/Halifax). Local retrieval timestamps are recorded separately in UTC.

Status: PUBLIC RESEARCH BASELINE / PROPOSED FORMAT SPECIFICATION. Not a Corpus Contract, admitted presentation, parser specification authorization, rule admission, legal finding, or declaration that Gate 5.3 passed.

## 1. Owner request and scope

The owner requested internet research into relevant report examples and a baseline for exact report-format artifacts. This authorizes this new research document and its new public-source evidence directory. It does not issue the proposed PHASE5-001I work order, amend earlier artifacts, or expand the single-unit legal certification effort.

Research covers the four markets in the approved CRP jurisdiction enumeration: CA, US, GB and AU. Market metadata identifies a publication's origin, never the consumer's analysis jurisdiction. All sources relied upon are bureau publications or government educational publications. No consumer report was retrieved, account accessed, service purchased, contact made, or private report transmitted. No parser, evaluator, website or deployment was changed.

"All examples" cannot mean every report ever issued: private portals, subscriber settings, historic versions, language variants and inaccessible artifacts prevent that claim. This is a broad, reproducible initial inventory of publicly discoverable relevant sources, with missing families explicit. Search results for commercial company reports, housing forecasts, background checks and private uploaded reports were excluded from consumer-format evidence. Subscriber reports are retained as separately classified comparison evidence, not substitutes for consumer disclosures.

## 2. Evidence package and capture outcome

Evidence directory: `SOURCE_CAPTURES\REPORT_FORMAT_BASELINE_2026-09-30\`.

- `source_inventory.json` and `supplement_inventory.json`: 26 requested official-source URLs with IDs, market, publisher and artifact description.
- `capture_manifest.json` and `supplement_manifest.json`: request URL, final URL where available, actual UTC retrieval timestamp, HTTP result, media type, byte count and SHA-256 for obtained bodies; failures retain their error.
- `reviewed_manifest.json`: combined records with review qualifications.
- `INVENTORY.md`: clickable per-source inventory with hashes and capture outcomes.
- `PUB-*.pdf`: ten locally obtained PDF originals. They are not all report specimens; one is an audit publication.
- `PUB-*.txt`: page-delimited native-text derivatives, separately hashed. Their extraction is a research inspection, not the CRP production parser.
- `PUB-001-page-1.png`, `PUB-005-page-2.png`, `PUB-012-page-4.png`, `PUB-021-page-2.png`: rendered pages inspected visually.
- `PUB-021-medical-marker-locator.json`: exact native-text words and coordinates for the subscriber medical marker.
- `file_custody_manifest.json`: package file sizes and hashes, excluding the custody manifest itself.

Local outcomes: **26 source records; 10 PDFs, 7 HTML bodies, 9 failed retrievals**. PUB-008 is an archive interstitial, not the requested FCAC PDF. PUB-026 is HTML returned for an expected PDF and is not format evidence. A 200 response alone is not proof that the requested artifact was obtained.

Some sources were readable through web extraction but local retrieval returned 403 or 404. Their web observations are listed below, clearly separate from locally pinned originals. No hash is invented for those originals. Source text, observed sample date, URL date, copyright date and current retrieval date are different properties.

Public availability is not permission to redistribute examples or use them as fixtures. Licence is NOT_RECORDED unless separately established. In particular the TransUnion subscriber guide says its educational sample cannot be used for testing; retain it as documentation only.

## 3. Bureau and presentation inventory

The full URLs and original hashes are in `INVENTORY.md`. Labels below are provisional research identifiers, not supported runtime families.

| Research family | Source IDs | What is established | Limitation / next evidence |
| --- | --- | --- | --- |
| US Experian Credit Educator consumer sample | PUB-001 | Official consumer educational artifact; visually inspected; disclosure sections and account blocks visible | Historical 2015 sample; one image-only tall PDF page; does not establish current native-text consumer family |
| US Experian enhanced subscriber profile | PUB-004 | Nine-page product/field guide with sample presentation | Subscriber product, not consumer disclosure; current production equivalence unestablished |
| US Experian eSolutions subscriber profile | PUB-021 | Three-page native-text sample; account-level medical marker at page 2 | Historical subscriber report dated 2008; marker semantics and consumer equivalent remain unresolved |
| US TransUnion print-image subscriber guide | PUB-002 | Web-readable 14-page guide with coded blocks and optional fields | Local 403; educational sample prohibited for testing; subscriber format is not consumer disclosure |
| US TransUnion consumer interactive/mail channels | PUB-013 | Bureau guide explicitly distinguishes where collection accounts appear in online and mailed views | Local 403; standalone exact sample not obtained; the advertised sample link resolved to the guide in web access |
| US TransUnion TUXML | PUB-015, PUB-025 | Official index identifies a subscriber response example and configurable output | Index/response local 403; web response is a JavaScript authentication interstitial, not validated XML |
| US Equifax TotalView | PUB-003 | Eleven-page subscriber guide, sample sections and column definitions | Do not confuse consumer subject matter with a consumer-facing disclosure channel |
| US Equifax hard-copy redesign | PUB-016 | Official announcement dated June 5, 2025 establishes hard-copy presentation change | Announcement is not exact report layout; current consumer specimen remains missing |
| CA Equifax annotated credit file | PUB-005 | Twelve-page guide; sample at PDF page 2, numbered field references and code explanations | Product/recipient channel must be verified; file-level data and scores do not prove a consumer portal/PDF family |
| CA Equifax legacy EN / FR | PUB-006, PUB-007 | Separate four-page guides and language-specific labels | Historical, distinct bytes/languages; do not merge with PUB-005 by brand or visual similarity |
| CA TransUnion / Equifax historical consumer samples | PUB-008 | FCAC web extraction identifies illustrated samples from both bureaus, August 2012 | Local route delivered archive interstitial; report images are not pinned locally |
| CA TransUnion consumer disclosure definition | PUB-014 | Official explanation separates full disclosure from business version | Local 403; route/definition does not establish report layout |
| GB Experian postal training disclosure | PUB-009 | Nine-page mock dated June 1, 2007; stable record identifiers and continuation headings | Historical educational format; no current consumer family admission |
| GB TransUnion credit-file guide | PUB-010, PUB-018 | Web-readable 53-page 2024 guide and statutory route | Local 403; guidance is not an acquired statutory PDF specimen |
| GB Equifax statutory channel | PUB-011, PUB-024 | Current route describes downloadable/printable statutory PDF | Old glossary URL locally 404; exact report specimen not obtained |
| AU Equifax public-access sample | PUB-012, PUB-017 | Official parent links fourteen-page sample; native text and account/payment tables | Cover dated January 4, 2016; URL mentions Mar17; these are not a proven current version date |
| AU legacy illion reference | PUB-020 | Forty-six-page compliance review mentions a sample screenshot among reviewed evidence | A reference to a screenshot is not the screenshot; no standalone consumer sample obtained |
| AU integrated Experian / illion consumer channel | PUB-022, PUB-023 | Current official route states integration complete and one Experian-branded report; field guide obtained | Treat integrated output as a separate candidate family; old illion presentation is not presumed equivalent |

Sources PUB-019 and PUB-026 are unsuccessful historical Experian sample routes, retained as retrieval evidence only. They must not silently redirect the baseline to a third-party copy.

## 4. Verified exact artifact examples

### 4.1 Image-only tall consumer sample: PUB-001

Original SHA-256: `601c2387b62a1a8f1425ffffcdc80a1e64ce1de0c8b1d662922350cd1f0dec01`.

The PDF has exactly one page measuring **954 x 5669 PDF points**, with **zero pages containing native text** under the inspection extractor. Visual rendering shows consumer information, statements, negative items, satisfactory accounts, inquiries and explanatory messages. This is a consumer sample, but it cannot seed a native-text locator unchanged. OCR and visual reading are distinct evidence modes; OCR has not been performed or validated here.

The medical-information discussion in its explanatory messages is boilerplate, not an account-level medical-debt observation. No consumer medical-account mapping is established by this sample.

### 4.2 Annotated two-column guide: PUB-005

PDF page 2, index 1, has a sample with two columns. Visible section markers distinguish identification, inquiries, public records, collection, financing statements, judgments, trades and banking. The collection sample is field reference **[33]** and the trade block **[36]**. Field meanings are described elsewhere in the guide.

Whole-page native extraction interleaves the columns; a text token adjacent to another token in extracted order is not necessarily in the same record. This artifact demonstrates why page dimensions, column boundaries and block association belong in an exact presentation record. Empty fields are possible; presence in the guide does not make every field mandatory in every report. This is not a New York consumer medical-debt specimen.

### 4.3 Postal record identifiers: PUB-009

The historical Experian GB training sample provides numbered items and explicit continuation headings. Credit-account information begins on PDF page 4 (index 3), with record C1; C2 continues on page 5 (index 4). The account records include start date, balance, limit, status history and update period.

A locator can reference section, record identifier and field label while preserving the source page. A fixed page number alone cannot identify the same record in a longer report. These markers are evidenced only for this sample family.

### 4.4 Multi-page account tables and graphical history: PUB-012

The Equifax AU sample's credit-liability records are on PDF pages 6 and 7; page 9 contains consumer enquiries and page 10 overdue accounts. Page 4 is a credit overview, visually inspected. Native text captures account labels and repayment legends, but does not by itself establish the association of every coloured history cell to a month.

Keep summary totals separate from individual account facts. A missing graphical cell in text extraction is unresolved, not evidence of a missed payment or absent information. The sample mixes 2016 cover/content dates; preserve them literally rather than repairing them into a coherent timeline.

### 4.5 Exact medical marker: PUB-021

This is the strongest **public locator example** found for the New York research question, not an admitted consumer presentation.

| Property | Verified value |
| --- | --- |
| Publisher / product | Experian / eSolutions U.S. Credit Profile Report |
| Original | `PUB-021.pdf`; SHA-256 in manifests and locator JSON |
| Total PDF pages | 3 |
| Relevant page | PDF page 2; zero-based index 1; 612 x 792 points |
| Section path | Trades > Installment Accounts |
| Record anchor | Credit and Collection / 3980999 / YC |
| Account classification shown | Collection account |
| Field label | Original creditor: |
| Exact raw value | Medical Payment Data |
| Whole-line bounding box | x0=38.82, top=585.87152, x1=163.1307, bottom=592.05152 points |
| Coordinate convention | x from left; top/bottom from upper page edge |
| Inspection | Native text words plus visually inspected rendered page |
| Normalized debt type | NONE; not inferred or certified |
| Consumer equivalent | UNRESOLVED |

The raw marker is explicit; whether it is a privacy substitute, creditor designation or legally sufficient debt identification requires separate evidenced interpretation. Do not derive medical debt from a provider name, insurance remark, collector code or general medical boilerplate. Do not equate this subscriber view with what the consumer actually receives. No case, jurisdiction, historical event or legal finding is supplied by this public sample.

## 5. Proposed exact report-format artifact record

This is a design baseline for later authorization. It is not an amendment to the governed fact schema or an operative admission rule.

Each independently evidenced presentation should have its own versioned record:

1. **Identity:** artifact ID; bureau publisher; product; recipient (consumer/subscriber/other); acquisition channel; market of publication; language; original format; observed date/version; research/admission status.
2. **Custody:** official parent/source URL; requested and final URL; UTC retrieval time; HTTP status; media type; original bytes/hash; licence status; source date distinguished from retrieval date.
3. **Physical structure:** total pages; per-page dimensions/orientation; native-text/image/mixed status by page; columns; headers/footers; continuation behavior; section boundaries; record delimiters; optional sections.
4. **Field mapping:** exact raw label/value; section path; enclosing record identity; PDF page index and displayed page label where present; bounding box; exact text span within a named hashed derivative; table row/column or source XML/HTML path where applicable.
5. **Interpretation:** family-specific code dictionary and provenance; normalization transformation/version; original preserved; event semantics; no date interpretation based merely on word similarity.
6. **Extraction limitations:** unresolved columns, images, missing pages, truncation, OCR ambiguity, explicit blanks, absent fields and unread sections remain distinct. Preserve governed field states; do not create legal statuses here.
7. **Rule projection:** separately record which required/decisive fact each observed field could satisfy, the rule/source version, unresolved semantics and consumer-presentability. A raw marker is not automatic rule satisfaction.
8. **Change control:** new specimen/version evidence; comparison to prior byte-pinned family; explicit drift review; owner admission record. Same logo, vocabulary or paper size is insufficient for family admission.

Original coordinates pin a fact in one artifact. A reusable locator additionally needs bounded section/record/field matching validated on independently authorized examples. Do not hardcode this sample's account name, number, balance or page as a universal rule.

## 6. Proposed field inventory by evidence class

These are observed research categories, not a universal required-field list. Individual field presence must be mapped to each exact specimen.

| Category | Candidate facts to preserve | Evidence examples / restrictions |
| --- | --- | --- |
| Publication metadata | report/reference date and identifier, product/channel | PUB-001 visual header; PUB-009 cover; PUB-012 cover; do not use date as legal effective period |
| Identification | names, address records, DOB, masked identifiers, employment | Family-specific labels; consumer jurisdiction never derived from them |
| Account identity | furnisher, account identifier, type, responsibility, record anchor | PUB-009 C-records; PUB-012 liability records; PUB-021 subscriber blocks |
| Monetary values | balance, limit, original amount, past due, payment | Different labels are not interchangeable; summary and account values remain separate |
| Event dates | opened, closed, reported, updated, paid, defaulted | Preserve raw value and source semantics; no universal date conversion |
| Payment history | month/year cells, code, legend and history period | Native text and graphics have separate limitations; dictionary must match presentation/version |
| Collections | collection actor, original-creditor field, assignment/update dates, status | PUB-005 sample field [33]; PUB-021 marker; collection does not imply medical |
| Public records | court/source, type, case number, dates, status and amounts | Historical examples do not establish current reporting practice or legal permission |
| Enquiries | requester, date, type, visibility when explicitly distinguished | Consumer and subscriber enquiry populations differ |
| Consumer text | statement, dispute notation, fraud alert | Bind to correct account/file scope; explanation boilerplate is not consumer data |
| GB presentation-specific | electoral roll, financial associations, aliases, linked addresses | PUB-009; do not require them across markets |
| CA presentation-specific | rating dictionaries, financing statements, banking fields | PUB-005/006/007; language/version-specific |
| AU presentation-specific | repayment grids, commercial enquiry separation, proprietorship/file access | PUB-012; keep consumer and commercial sections separate |
| Medical marker | exact account-associated label and raw value | PUB-021 demonstrates a subscriber marker only; no supported consumer mapping yet |

## 7. Search coverage, gaps and source drift

Queries covered official consumer sample PDFs, disclosure guides, statutory report channels, English/French Canadian artifacts, subscriber print-image/XML examples and medical collection markers. Record-level URLs are preserved; this was not a crawl of every report vendor or every derivative app.

Confirmed gaps:

- A current byte-pinned US consumer disclosure showing an account-level explicit medical-debt representation remains missing.
- Current US Equifax hard-copy redesign layout is not obtained; old subscriber examples do not fill that gap.
- TransUnion US/CA consumer originals and GB 2024 guide originals were blocked locally, despite web-readable explanations.
- Current GB Equifax/Experian/TransUnion consumer specimens are not established by older training examples or request forms.
- Current combined AU Experian output needs its own exact specimen; the official current route states integration with illion is complete. Earlier independent illion examples cannot establish equivalence.
- French CA TransUnion, historical version coverage, scans/OCR, accessibility exports and third-party app presentations remain uninspected.
- Native-text derivatives alone cannot verify image-only fields or graphical payment cells.

Third-party sources surfaced in search (including educational copies and tenant-screening wrappers) were not relied on for bureau family admission. Business credit reports about companies and identity-only reports are not consumer credit-disclosure substitutes. No legal reporting periods, medical-debt policy thresholds or statutory deadlines were admitted from any educational guide.

## 8. Consequence for PHASE5-001I and Cline

The research supplies a durable format inventory and one exact medical-marker locator. It does **not** clear B-3 for a production consumer disclosure, establish legal-rule admission, choose the consumer's jurisdiction, or pass Gate 5.3.

Recommended first **format investigation**, not first supported production combination: Experian US consumer disclosure. Rationale: its official historical consumer sample can be pinned, and the separately classified eSolutions sample exposes a native-text account marker useful for comparison. No owner bureau selection is inferred from this recommendation.

Cline should use this baseline as public research input after the relevant work order is issued:

1. Read the manifests and exact artifact records, retaining channel, age and capture limitations.
2. Keep the legal effort to the single US-NY candidate; the cross-market inventory is not authorization to start other legal units.
3. Resolve an exact consumer disclosure presentation through an authorized official public route or existing separately authorized evidence. Do not request additional consumer evidence to establish a legal element and do not invent a medical-labelled sample.
4. Verify the literal account marker, enclosing record and source locator; separately establish its report semantics. The subscriber marker cannot be copied into the consumer mapping as fact.
5. Keep all unsupported mappings unresolved. Escalate a proposal to admit a different input channel as an explicit owner decision; do not redefine consumer disclosure to fit the available sample.
6. Use the issued work order's permitted-file list; leave existing readiness/legal/source records unchanged unless that order explicitly permits an append or amendment.

Until those conditions are evidenced, M-1 remains pending. Existing source pin, effective-period, preemption and exception questions are untouched.

## 9. Verification and completion

All obtained originals and native-text derivative hashes were checked locally. The medical-marker JSON was generated from actual PDF words and validated against their raw text; page 2 was rendered and visually inspected. Four representative artifact pages were rendered and viewed. Full visual review of every page and OCR validation were not performed.

The reviewed manifest preserves all 26 records, including nine failed local retrievals and the two misleading PDF routes that returned HTML. No failed download is called a captured original, no guide is called a production consumer report, and no reference to a sample is called an acquired sample.

Deliverable complete as an initial public research baseline. Production format admission, Gate 5.3 completion and legal findings remain unestablished.
