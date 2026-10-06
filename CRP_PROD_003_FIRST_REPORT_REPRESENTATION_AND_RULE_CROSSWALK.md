# CRP PROD-003 — First Consumer Report Representation and Rule Crosswalk

| Field | Value |
| --- | --- |
| Document | First Consumer Report Representation and Rule Crosswalk |
| Repository | https://github.com/dpwebb/CRP-NEW.git |
| Local workspace | `C:\CRP-NEW` |
| Work order | `CRP_PROD_003` — owner-issued in conversation ("The owner authorizes PROD-003 — First Consumer Report Representation and Rule Crosswalk") |
| Rank of this document | 6 — an Active Work Order record. It is not a governing contract, admits no rule, creates no coverage and authorizes no finding. |
| Effective date | 2026-09-30 |
| Evidence package | `SOURCE_CAPTURES\PROD-003\` |
| Read-only inputs | the PHASE5-001O ledger and its satellites; the admitted legacy corpus; the recorded legacy system at `C:\Users\webbd\crp-credit-app` |
| Legacy access mode | **read-only, in place**: nothing copied, moved, renamed, written or transmitted |
| Deployment | none. No upload, no hosting, no consumer-data transmission, no billing, no authentication, no external report processing |

## The answer in one table

| Dimension | Selected value |
| --- | --- |
| Jurisdiction | `CA` / `CA-NS` (exact region; 16 ledger rows; the rule's recorded association is `EXACT`) |
| Bureau and channel | Equifax, Canada, **consumer channel** |
| Presentation | `PR-01` — the Equifax Canada consumer-channel credit report specimen, 22 pages, A4, native text on every page, SHA-256 `E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F` |
| Rule unit | `CA-NS-CRA-S10-3-C-LIMB-1` — `ca-ns.cra.s10_3_c.debt_retention_6y`, **first limb only** (six years from the last payment made on the debt), sourced from `CRP-LSRC-0354` |
| Report facts | the collection record's printed `Last Payment Date` (PDF page 16, the Collections section) and the printed `Request Date` reference date (page header, every page) |
| Deterministic evaluation | calendar arithmetic on two resolved dates: 1,919 days elapsed against a 2,191-day six-year span → `PERIOD_NOT_EXCEEDED` on this specimen |
| Permitted result ceiling | `PROBABLE_VIOLATION`, never `VIOLATION` — and only if the rule record, when built, records the direct-report contract §4 retention exception |
| Gate effect | Gate 5.3 is **reached for one candidate on one presentation**. No gate is declared passed as a whole. |
| Next work order | the parser/evaluator work order in §11. Not executed here. |

## 1. The question and the owner scope decision

The order asked for two durable artifacts and one decision: a §4 item 2 **report-representation register**,
the §4 item 3 **candidate-to-rule-unit crosswalk**, and the selection of the strongest first combination
from evidence. The owner's scope decision issued with the order was:

> Selection may use any jurisdiction and relevant statute already accepted under PHASE5-001O. The
> unresolved US-NY medical-debt candidate remains preserved, but is no longer the exclusive first
> implementation target.

This order did not waive a single report-evidence requirement to use that freedom. It re-verified the
prerequisite gates from their own acceptance evidence (§3), inventoried every consumer-report sample,
fixture and presentation mapping in both trees (§4), measured what a named extraction method actually
extracts (§5–§6), selected the combination on four stated criteria (§7), recorded the permitted ceiling and
the one recorded divergence that governs it, and wrote the smallest concrete implementation order that the
resulting evidence supports (§11). Report checking remains unavailable for every region, and the consumer
application still says so.

### 1.1 What this order is not

- It is not a rule admission, a coverage change or a finding. No `VIOLATION` and no `PROBABLE_VIOLATION`
  is produced for anyone, and no consumer-visible output of any class is authorized.
- It is not a parser and not an evaluator. §11 is a work order, not an implementation.
- It is not a legal re-reading. The accepted corpus is used as accepted; no statute, effective period,
  preemption question or exception was reopened.
- It is not a channel expansion. Subscriber, screening, training and synthetic artifacts stay outside the
  consumer-disclosure boundary, exactly as the earlier format investigations left them.


## 2. What was read, and the discipline that was held

| Input | Use |
| --- | --- |
| `CRP_CORE_CONSTITUTION.md`, `CRP_LEGAL_INVARIANT.md`, `JURISDICTION_CONTRACT.md` | rank 1–3 authority: parser failure is never evidence, `EXTRACTION_UNRESOLVED` is not `ABSENT_FROM_REPORT`, jurisdiction is never inferred from the report |
| `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md`, `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md`, `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md`, `CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md`, `CRP_JURISDICTION_ENUMERATION.md` | rank 4: the candidate gate, the permanent exclusions, the admitted legacy artifacts, the region associations |
| `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` | rank 5: Phase 5.3 and Gate 5.3, Phase 5.4 and Gate 5.4, the durable-artifact definitions |
| `CRP_PROD_001_READINESS_AND_IMPLEMENTATION_PLAN.md` | the readiness audit this order amends (§14) |
| `CRP_PHASE5_001O_LEGACY_CORPUS_ACCEPTANCE_AND_COVERAGE_RECONCILIATION.md` and `SOURCE_CAPTURES\PHASE5-001O\*` | the verified coverage ledger (437 rows), the four-layer gate reassessment, the 34 admitted legacy artifacts |
| `CRP_PROD_002_CONSUMER_JURISDICTION_SURFACE.md` and `SOURCE_CAPTURES\PROD-002\*` | the jurisdiction surface whose "Report checking not yet available" text this order must keep true |
| `CRP_PUBLIC_REPORT_FORMAT_BASELINE_2026-09-30.md`, `CRP_EXPERIAN_US_CONSUMER_FORMAT_INVESTIGATION.md`, `CRP_ALTERNATE_US_CONSUMER_FORMAT_INVESTIGATION.md` and their capture packages | the earlier public-format research, retained with its recorded classifications |
| `C:\Users\webbd\crp-credit-app` | the recorded legacy system: its two real consumer documents, its 461-file generated regression corpus, its admitted rule corpus and its recorded mappings |

**No generic public-sample search was repeated.** The order forbade it, and the earlier investigations had
already recorded why further searching has no current purpose. Everything inspected here was already on
disk.

**Identifier discipline.** No report content left the machine. No private report was copied into this
repository, and no identifier taken from a report's *content* — name, address, date of birth, social
insurance number, account number, member number, telephone number, e-mail address, score or balance —
appears in any PROD-003 artifact; `SOURCE_CAPTURES\PROD-003\test_prod003_crosswalk.cjs` asserts that
mechanically (§13). Each specimen stays where it is, byte-pinned by SHA-256, and the only report-content
values reproduced anywhere in this order are two dates, because a date printed on a report is not a direct
identifier and the deterministic evaluation in §8 is defined on exactly those two values. The specimen's
own file name is reproduced as the artifact's location, because a locator that does not name the file
cannot be checked; the report's content is not.

## 3. Prerequisite gates, verified from their acceptance evidence

Every state below was read out of **PHASE5-001O's own gate reassessment** and re-measured where it is
measurable, before this order claimed anything. The machine record is
`SOURCE_CAPTURES\PROD-003\gate_prerequisites.json`, and `test_prod003_crosswalk.cjs` fails if a recorded
state here differs from the 001O record.

| Gate | State recorded in PHASE5-001O | Re-verified by this order | Effect of this order |
| --- | --- | --- | --- |
| 5.1 Freeze and reconcile the inventory | `MET_WITH_RECORDED_ADMINISTRATIVE_LIMITATIONS` | 437 ledger rows; 34/34 admitted legacy artifacts re-hashed and matching | none — no count, duplicate or disposition was touched |
| 5.2 Report-only dispositions | `ADVANCEABLE_FROM_THE_ACCEPTED_CORPUS` | the six report-mapping-dependent rows are still present, still blocked, still dispositioned `UNRESOLVED` | **this order supplies the evidence route for one of them** — `CRP-LSRC-0354` now has its exact presentation mapping; no ledger row was changed |
| 5.3 Report-schema and representation | `STILL_EVIDENCE_GATED` | the gate text requires a verifiable representation and exact location per proposed candidate, or a source-grounded unresolved status | **reached for one candidate on one presentation**: the supported-presentation evidence now exists for the selected unit, and every other candidate keeps a source-grounded unresolved status |
| 5.4 Select and certify rule units | `NOT_STARTED` | no rule record exists | not started here: this order supplies the crosswalk input a rule record needs and deliberately stops there |
| 5.5 Deterministic evaluator | `NOT_STARTED` | no evaluator specification exists | not started: §11 is the smallest order that could implement it |
| 5.6 Validation before findings | `NOT_STARTED` | no suite and no replay exist | not started |
| 5.7 Admission and finding authorization | `NOT_REACHED` | 0 admitted governed rules; 0 permitted findings | not reached: no rule was admitted, no coverage changed, no finding class was created |

The one claim this order makes about a gate is therefore narrow and stated in full:

> **Gate 5.3 is reached for exactly one candidate on exactly one presentation.** It is not claimed as passed
> for the gate as a whole, and it is not claimed for any other candidate.


## 4. The inventory: consumer disclosures, subscriber reports, educational samples and synthetic fixtures

`SOURCE_CAPTURES\PROD-003\presentation_inventory.json` records every artifact found, with its audience,
channel, bureau, market, format, byte count, SHA-256 and known limitations. Forty-three workspace captures
were re-measured (0 pinned-hash mismatches) and the legacy tree was inspected in place.

| Class | Count | What it is | Why it cannot be the first presentation |
| --- | ---: | --- | --- |
| Workspace captures classified `CONSUMER` | 7 | official consumer-channel samples and routes | the ones obtained are historical, image-only or not a report; the others were never retrieved |
| `CONSUMER_GUIDE` | 14 | guides, educational articles and channel pages | guidance about a report is not a report |
| `SUBSCRIBER` | 9 | product guides and one 2008 subscriber sample carrying the medical marker | a subscriber product is not the consumer's disclosure |
| `TRAINING` / `THIRD_PARTY_SCREENING` / `SCREENING` | 4 | a 2007 training mock, a tenant-screening sample, a third-party webinar deck | not the consumer's own channel |
| `NOT_APPLICABLE` | 8 | announcements, interstitials, search-index captures | not artifacts |
| `NOT_RETRIEVED` | 13 | routes that failed locally or returned HTML for an expected PDF | no bytes to evidence anything |
| **Legacy real consumer documents** | **2** | the Equifax Canada consumer-channel report and the TransUnion Canada consumer disclosure | — **these are the only two** |
| Legacy generated fixtures | 461 | the legacy regression corpus (AU 112, CA 126, UK 105, US 118; 23,627,410 bytes) | generated, not issued by any bureau |
| Legacy human label over a fixture | 1 | `scripts\ab\gold\US-Equifax-NC-001.gold.json` | a label over a generated file proves an extraction, never a bureau's representation |

### 4.1 How the separation was made, and what decided it

- **Audience and channel** came from each artifact's own manifest record, its own printed metadata, or the
  earlier investigation's classification — never from the legacy application.
- **The 461-file corpus is a generated regression corpus.** Every probed file prints a fixture identity
  header in its own first-page text, and one of them states its provenance outright: `Source style:
  Experian / Equifax / TransUnion U.S. style`. A style imitation is not evidence of any bureau's
  representation, whatever its field labels say. Its value is different and is recorded separately: it
  demonstrates that these field labels *can* be extracted deterministically from a native-text tabular
  page, which is a property of a method, not of a bureau.
- **The two real documents identify themselves.** One is a 22-page A4 PDF produced by Chromium from
  Equifax Canada's consumer channel and carries a request date on every page; the other is a 12-page
  letter-size PDF whose own metadata records `Author: TransUnion Canada`, the title `Consumer Disclosure
  for <consumer name>` and the subject `Consumer Disclosure Report`, produced by `iText 2.1.7`, encrypted
  with printing and copying permitted.
- **Nothing was copied.** Both documents stay in the legacy tree, byte-pinned by the digests in §5.

### 4.2 Existing operational mappings examined alongside the accepted corpus

The order asked for the operational mappings to be examined together with the accepted corpus, without
reopening statutory validity. What exists is of three kinds, and all three are recorded with digests in
`presentation_inventory.json`:

1. **The accepted corpus's own report-facing fields.** Each admitted rule row carries
   `requiredReportFields`, `canonicalFields`, an `evidenceLevel` and a permitted conclusion. Across the
   437 ledger rows there are **31 mappings the legacy corpus marks `report_detectable`** (US-CA 9, US-WA 6,
   US-NY 5, US_FEDERAL 11) and **46 it marks report-relevant but not detectable**. These are legacy
   readings of a field, and this order re-tests a reading against an actual presentation before relying on
   it.
2. **The recorded invocation path.** `requiredReportFields` on the selected rule names
   `tradeline.lastPaymentDate`, and the rule's own recorded note states that the legacy extraction schema
   withholds the class for a collection because a collection carries no such field *in that schema*.
3. **The legacy fixture metadata and label.** `scripts\lib\creditReportMeta.ts` projects a fixture *file
   name* into a region code, and the human gold label canonicalizes one fixture's values to the legacy
   `extraction.v1` field names. Both are fixture-metadata work; neither reads a real report.

**What the corpus's field limitation did not decide.** The build plan's Phase 5.3 forbids using the old
detector's field limitations as the new product boundary. The presentation in §5 prints a `Last Payment
Date` inside a collection record, which is exactly the field the legacy schema says a collection does not
carry. The presentation decided the question here, not the schema.


## 5. The supported presentation

**The selected presentation is `PR-01`:** the Equifax Canada consumer-channel credit report, held by the
repository owner at `C:\Users\webbd\crp-credit-app\packages\backend\fixtures\reports\equifax-david-webb.pdf`.

| Property | Verified value |
| --- | --- |
| Artifact | `LEG-CONSUMER-EQ-CA` — one consumer's own credit report requested from Equifax Canada's consumer channel |
| SHA-256 | `E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F` |
| Bytes / pages / size | 96,393 / 22 / A4 (594.96 × 841.92 pt) |
| Producer / creator | Skia/PDF m81 / Chromium — a browser print of the bureau's consumer page, not a bureau back-office export |
| Native text | **22 of 22 pages** carry native text under the named method |
| Encryption | none |
| Sections observed (pages) | credit report header with `Request Date` on every page (1–22); credit score (2); employment (3); `Accounts - Revolving` (5–6); `Accounts - Installment`, `Accounts - Mortgage`, `Accounts - Open` (7–8); inquiries (10–11); public-records summary (13); bankruptcy section with an affirmative no-bankruptcy statement (14); **Collections (16–17)**; judgments section with an affirmative no-judgment statement (19); `Alerts, Disclosures And Contact History` (21) |

The extraction method is named, reproducible, and versioned by its own banner:
`pdftotext -f <page> -l <page> -layout <file> -` from the local Poppler build recorded in
`extraction_evidence.json`. It is run against the pinned bytes, page by page, and every result in §6 is
reproducible by re-running it.

**The secondary presentation is `PR-02`:** the TransUnion Canada consumer disclosure
(`244D58080254D9879468A43D56DA02BC952A20579E1BE9A51F83B7378439EFB4`, 12 pages, 12/12 pages native text).
It independently prints its own `Last Payment Date` with a value (2013-10-03 and 2020-08-09), which
corroborates that the last-payment representation is not a peculiarity of the Equifax specimen. It
corroborates the **field**, and it is not admitted as the format for any rule unit: its sections, record
blocks and labels differ, it prints no `Request Date` label, and no rule may be evaluated against a
TransUnion layout with the Equifax locator.

### 5.1 The exact admission boundary

- This **one artifact, at this digest, from this consumer channel** is the supported presentation.
- It is *not* every Equifax Canada product, *not* every Equifax Canada report version, *not* another
  bureau, and *not* a licence to read any other PDF as if it were this one.
- A different specimen — another print date, another product, another bureau, a scan, a photograph, a
  mobile view or another language — is **unsupported** until it is separately evidenced and admitted.
- The presentation establishes how an item is displayed. It establishes **no legal element, no
  jurisdiction and no finding**.

### 5.2 Demonstrated extraction versus proposed extraction

| | Demonstrated | Proposed |
| --- | --- | --- |
| Meaning | the named method returned the printed label **and its adjacent value** from the pinned bytes, at a named page | a field that plausibly exists, a visual location, or a fixture's label |
| Examples here | `Last Payment Date` on page 16 (value 2021-02-01); `Request Date` on every page (value 2026-05-05); `First Delinquency` on page 16; the affirmative no-bankruptcy and no-judgment statements | any field of the alerts/disclosures table on page 21, whose labels print in a multi-row table this method did not pair with values; every field of the 461 generated fixtures; every field of any subscriber or screening document |

A visual location alone does not establish a working parser, and this order does not treat it as one. Two
counter-examples are recorded in `extraction_evidence.json` precisely so the boundary is measured rather
than asserted: `PUB-001` (the 2015 Experian consumer educational sample) yields **zero characters** on its
single page under this method, and `EXP-006` is likewise image-only. A page with zero characters is
recorded as zero characters. It is never recorded as an absent field.


## 6. The report-representation register

`SOURCE_CAPTURES\PROD-003\report_representation_register.json` is build plan §4 item 2: the supported
format, its exact displayed fields and events, their locations, the extraction limitations and the
unresolved mappings. Its six field records are:

| Record | Field | Location on `PR-01` | Extraction | Date meaning | Demonstrated |
| --- | --- | --- | --- | --- | --- |
| `FACT-01` | a debt record is present | `Collections`, **page 16**; each record begins with its own collector name line, then `Date Assigned`, `Member Name`, `Phone Number`, `Member Number`, `First Delinquency`, `Account Number`, `Amount`, `Status`, `Balance`, `Narrative`, `Date Paid/Settled`, `Date Verified`, `Last Payment Date` | `pdftotext -f 16 -l 16 -layout` | not a date | **yes** |
| `FACT-02` | `Last Payment Date` of the debt record | the row label inside a collection record, **page 16** (continued record on page 17) | `pdftotext -f 16` / `-f 17` | the date the record states the last payment was made — the rule's first-limb clock start | **yes** — raw `2021-02-01` in the printed `DDDD/DD/DD` form |
| `FACT-03` | report reference date | `Request Date` in the page header, **every page**, identical value | `pdftotext -f <page> -l <page>` | the date the consumer requested the report | **yes** — `2026-05-05` |
| `FACT-04` | `First Delinquency` of the debt record | the row label inside a collection record, **page 16** | `pdftotext -f 16` | the date the record states the first delinquency occurred — **not** the default-in-payment date | **yes** |
| `FACT-05` | the date the default in payment occurred (the rule's second limb) | no row of the collection record carries this meaning on this specimen | `pdftotext -f 16` / `-f 17`, then a resolved reading of the record's own printed row labels | — | **no: `EXTRACTION_UNRESOLVED`** |
| `FACT-06` | public-record sections | public-records summary **page 13**, no-bankruptcy statement **page 14**, no-judgment statement **page 19** | `pdftotext -f 14` / `-f 19` | not a date | **yes** — affirmative printed absence statements |

### 6.1 Explicit blanks, date meanings and ambiguity handling

| Printed label with no value on this specimen | Section | Page |
| --- | --- | --- |
| `Phone Number` | Collections | 16 |
| `Status` | Collections | 16 |
| `Narrative` | Collections | 16 |
| `Date Paid/Settled` | Collections | 16 |
| `Date Verified` | Collections | 16 |

Each of those labels is printed and the next line begins another label, which is a resolved reading of
*this* specimen's layout and nothing more. On another layout the same absence of a value proves nothing.

**Date meanings are recorded, not assumed.** `Request Date` is the report's request date; `Last Payment
Date` is the date the record states the last payment was made; `First Delinquency` is the date the record
states the first delinquency occurred; `Date Assigned` is the date the record states the debt was assigned
to the collection agency; `Opened` is an account's opening date. Only `Request Date` and `Last Payment
Date` are used by the selected unit. `First Delinquency` **may not** be read as the default-in-payment
date, and `Opened` may not be read as either.

**Ambiguity handling.** A missing, unreadable or differently-labelled value is `UNRESOLVED`. It is never
recorded as `ABSENT_FROM_REPORT`, never inferred from position, and never defaulted from another date. The
comparison date is read from the page header only, and only when the same value appears on every page; a
report whose header carries no such label leaves the comparison unresolved and the evaluation simply does
not run.

### 6.2 Unsupported-format behaviour

| Input | Behaviour |
| --- | --- |
| a bureau report other than `PR-01` | `UNSUPPORTED_PRESENTATION` — the register holds no locator for it; no field is read, no field is recorded as absent, no finding is possible |
| a subscriber, business, screening or tenant-screening document | `OUT_OF_CHANNEL` — never read as a consumer disclosure, whatever its field labels say |
| a generated or synthetic fixture | `NOT_CONSUMER_EVIDENCE` — a fixture may exercise an evaluator in test; it can never be the report a rule runs on |
| an image-only or scanned page | `EXTRACTION_UNRESOLVED` — this register specifies no OCR; a zero-character page is not an absent field |
| an encrypted or unreadable PDF | `EXTRACTION_UNRESOLVED`, recorded as a document-level failure, never as report content |
| a `PR-01` document whose field label is missing, renamed or unreadable | `EXTRACTION_UNRESOLVED` for that fact: the evaluation does not run, no finding is emitted, the field is never recorded as `ABSENT_FROM_REPORT` and never defaulted from another date |

### 6.3 The unresolved mappings, stated

1. `FACT-05` — the default-in-payment date — is unseated on `PR-01`. The record prints `Date Assigned`,
   `First Delinquency`, `Date Paid/Settled`, `Date Verified` and `Last Payment Date`, and none of them is
   the date the default in payment occurred as the admitted rule text reads that limb. **This is a
   statement about this specimen's row set, not a statement that no report states such a date**, and the
   second limb stays unseated rather than being defaulted from `First Delinquency`.
2. A second independently authorized Equifax Canada specimen is required before the locator is called
   reusable rather than demonstrated once.
3. The alerts/disclosures table on page 21 prints the labels `Service Type Details`, `Date Reported` and
   `Compliance Date` in a multi-row table; this method paired no value with those labels on the same line,
   so no field from that table is claimed.


## 7. The candidate-to-rule-unit crosswalk

`SOURCE_CAPTURES\PROD-003\crosswalk.json` is build plan §4 item 3. It selects one combination on four
criteria, records one runner-up, seven rejections, six dependencies and the permitted ceiling.

### 7.1 The four criteria, answered with evidence

| Criterion (owner's words) | Answer | Evidence | Verdict |
| --- | --- | --- | --- |
| supported consumer-report presentation | `PR-01`, byte-pinned, 22/22 pages native text | §5; `presentation_inventory.json`, `extraction_evidence.json` | MET |
| accepted rule with an established jurisdiction association | `CRP-LSRC-0354` / `ca-ns.cra.s10_3_c.debt_retention_6y` at exact region `CA-NS`, association status `EXACT`; source artifact `rules.canada.ts`, admitted, digest re-verified | PHASE5-001O coverage ledger row; `admitted_artifacts.json` | MET |
| clearly located report facts needed by that rule | `Last Payment Date` inside the Collections record (page 16) and the `Request Date` reference date (every page) | register records `FACT-02`, `FACT-03` | MET |
| feasible deterministic evaluation | calendar arithmetic on two resolved dates against the rule's own six-year period | §8 | MET |

### 7.2 The selected unit

| Field | Value |
| --- | --- |
| Rule unit | `CA-NS-CRA-S10-3-C-LIMB-1` |
| Legacy rule reference | `ca-ns.cra.s10_3_c.debt_retention_6y` |
| Source entry | `CRP-LSRC-0354`, owner acceptance `OWNER_ACCEPTED_LEGAL_AUTHORITY` |
| Citation and instrument | `s. 10(3)(c)`, Consumer Reporting Act (Nova Scotia), R.S.N.S. 1989, c. 93 |
| Limb | **first limb only**: six years from the last payment made on the debt. The second limb (where no payment was made, six years from the date the default in payment occurred) is **not** part of this unit. |
| Admitted trigger text | "A consumer reporting agency shall not include in a consumer report information regarding any debt more than six years after the last payment was made on the debt or, where no payment was made, more than six years after the date on which the default in payment occurred." |
| Required report field as admitted | `tradeline.lastPaymentDate` |
| Report fact mapping | `Last Payment Date` (Collections row, page 16) → `FACT-02`, `DEMONSTRATED_EXTRACTABLE`; `Request Date` (header) → `FACT-03`, `DEMONSTRATED_EXTRACTABLE` |
| Ledger dependencies | `REGISTER_DISPOSITION_UNRESOLVED` |
| Ledger administrative limitations | locator/effective information not recorded; prior review record not held; formal edition or historical version not recorded |
| Ledger gate layers open | `REPORT_FORMAT_AND_APPLICATION_DEPENDENCIES`, `READINESS_FOR_DETERMINISTIC_EVALUATION` |
| Determinism | a pure function of the two resolved dates and the rule's six-year period: no sampling, no scoring, no model, no accumulated state |

### 7.3 Why this one, and not another

- **It is the only combination in which a real consumer disclosure supplies, at a located page and record,
  the exact printed field the admitted rule text reads, and in which the evaluation is a pure function of
  two resolved dates.**
- The rule's own recorded note states that the last payment is "the one report-to-statute mapping this
  reading supports", which is precisely the mapping the specimen demonstrates.

**Runner-up.** `CA-ON` × `ca-on.cra.s9_3_f.debt_or_collection_7y` (`CRP-LSRC-0367`) on the same
presentation. Not selected because the Ontario clause selects between two branches with its own condition
and leaves the second branch's own start as a further alternative, as the admitted corpus records, whereas
the Nova Scotia first limb anchors on one printed field. Its own representation is **not** verified by this
order and it is preserved as a candidate.


**Rejections.**

| Candidate | Reason |
| --- | --- |
| `us-ca.civ.1785.18.a.public_record_source_and_date` (`CRP-LSRC-0288`) | `PRESENTATION_ABSENT` — no US consumer disclosure with demonstrated extraction exists. PUB-001 is a 2015 image-only educational sample with zero native text; EXP-006 is a third-party screening sample; PUB-021 is a subscriber sample; the 461-file legacy corpus is a generated regression corpus. A public-record rule cannot be evaluated on a Canadian presentation. |
| `us-ca.civ.1785.14.b.accuracy_self_contradiction` (`CRP-LSRC-0276`) | `PRESENTATION_ABSENT` — the same reason, even though its fact pattern (a closed or paid status beside a balance) is visible in `PR-01`. |
| the `US_FEDERAL` report-detectable rows, e.g. `us-federal.fcra.605.a.4.collections_and_chargeoffs_7_years` (`CRP-LSRC-0017`) | two failures: `PRESENTATION_ABSENT`, and `JURISDICTION_UNEXPRESSIBLE` — the ledger records them as country-wide sources and the enumeration defines no federal region, so the association cannot be selected by a consumer without a later explicit governed-rule record. |
| `CRP-LSRC-0194` (`US-NY`, N.Y. Gen. Bus. Law § 380-j(a)(3)) | **preserved, not selected.** Its blocker `CANDIDATE_REPRESENTATION_UNRESOLVED_GATE_5_3_M1` stands: no byte-pinned US consumer disclosure carrying an account-level medical-debt representation has been obtained. The owner's scope decision removes it as the exclusive target and changes none of its qualifications. |
| `CRP-LSRC-0319` (PIPEDA Schedule 1 clause 4.6 completeness/omission limb) | country-wide scope with no selectable region, and its completeness/omission limb needs an external reference for what is missing, so no deterministic test runs from the report alone. |
| the generated US-layout fixtures | `SYNTHETIC_FIXTURE` — a generated file is not a consumer report, and a human label over a generated file proves an extraction, never a bureau's representation. |
| `PR-02` as the unit's format | `NOT_SUBSTITUTABLE` — a different bureau's layout cannot be read with `PR-01`'s locator. |

### 7.4 The permitted result ceiling, and the one divergence that governs it

| | Value |
| --- | --- |
| Ceiling | **`PROBABLE_VIOLATION`** |
| Never available | `VIOLATION` |
| Why capped | the admitted record states its effective period as unresolved (`effectiveFrom` null, `effectiveDateBasis` `recorded_gap_commencement_not_read`), which under the direct-report contract §6 permits only the probable path with a plain-English timing qualification; and the truth of the printed last payment is a report-stated historical event the report asserts and cannot prove |
| Condition | the ceiling holds only if the rule record, when built, records the direct-report contract §4 retention exception (the only unresolved fact is the underlying historical event the report itself states) and satisfies the §6 probable-candidate gate. If the owner declines that exception, the ceiling for this unit is an observation-class statement and **no finding of either class** |
| **Recorded divergence** | the admitted corpus classifies this row `determinability: D3` with `permittedConclusion: "observation"` and no D5 mechanism. That classification reasons from the whole of s. 10(3)(c) — including its unseated second limb and its unprinted commencement date — and from the legacy extraction schema, in which a collection carries no last-payment field. The CRP presentation evidence now supplies the first limb's printed anchor on a real consumer disclosure, and the CRP contract decides the ceiling, not the legacy classification. **Recorded, not overridden.** The owner's rule-corpus amendment decides which governs; until then no finding of either class may be emitted. |

## 8. The deterministic evaluation on the specimen

| Step | Value |
| --- | --- |
| Rule period | six years from the last payment printed on the debt |
| Clock start (resolved fact) | `2021-02-01` — the `Last Payment Date` printed inside the collection record on page 16 |
| Reference date (resolved fact) | `2026-05-05` — the `Request Date` printed in the page header of all 22 pages |
| Days elapsed | **1,919** |
| Six-year boundary from the clock start | `2027-02-01` |
| Six-year span in days | **2,191** |
| Comparison | `intervening_days > six_year_span_in_days` |
| Result on this specimen | **`PERIOD_NOT_EXCEEDED`** |

The evaluation **runs and resolves**. It is a pure function of the two resolved dates and the period the
admitted rule states: no sampling, no scoring, no model, no state, no reliance on run time, locale or
order. `PERIOD_NOT_EXCEEDED` is a computed result, not an absence of data, and it emits nothing to a
consumer. The evaluator is unresolved — and emits nothing — when the debt record prints no
`Last Payment Date`, when the report reference date is unreadable, when the item is not a debt record at
all, or when the uploaded document is not the supported presentation.

The positive path is not demonstrated on a real specimen: this specimen's period has not run out. The
implementation order in §11 therefore requires a positive-path test computed from the rule itself, and it
forbids using a generated fixture as if it were a real report.


## 9. What the evidence supports operationally

**Supported today.** One consumer-report presentation (`PR-01`) is evidenced well enough to locate two
specific printed facts on it and to run one deterministic comparison on them. That is the whole of the
operational capability this order establishes. Concretely, the evidence supports:

1. reading a `Last Payment Date` from a Collections record on a byte-pinned consumer disclosure, with the
   page and the enclosing record named;
2. reading the report's request date from the page header;
3. comparing them against a six-year period the admitted rule states, deterministically and reproducibly;
4. refusing — with a recorded reason rather than a guess — when either value is not resolved.

**Not supported today, and not claimed.** No consumer-visible output of any class. No `VIOLATION`, no
`PROBABLE_VIOLATION`, no observation, no score, no coverage change, no deadline, no advice. The consumer
application keeps saying "Report checking not yet available." for all 82 regions, and PROD-002's build
check still fails if the generated data ever claims otherwise — this order re-ran that check (§13).

**What the evidence does not support extending.** `PR-01` is one specimen from one bureau's consumer
channel. Nothing here supports treating another Equifax Canada product, another bureau, a scan, a
photograph, a mobile view, a subscriber report or a generated fixture as the same presentation. The
secondary specimen is evidence about a *field*, not about a layout, and no rule may be evaluated against
it with `PR-01`'s locator.

**What the selected unit cannot do.** It cannot emit a `VIOLATION` at all, and it cannot emit a
`PROBABLE_VIOLATION` unless and until the owner's rule admission records the direct-report contract §4
retention exception. Its second limb is unseated on this presentation, so the unit is the first limb only.

## 10. Gate status

| Gate | Status after this order | Basis |
| --- | --- | --- |
| 5.1 | met with recorded administrative limitations (unchanged by this order) | PHASE5-001O gate reassessment, re-verified |
| 5.2 | advanceable from the accepted corpus (unchanged), **with one of its six report-mapping dependency routes now evidenced** | this order supplies `CRP-LSRC-0354`'s exact presentation mapping; the ledger itself is untouched |
| 5.3 | **reached for one candidate on one presentation** — not passed as a gate, and not reached for any other candidate | the register records a verifiable representation, an exact location, a named extraction method and an explicit unresolved status for the second limb and for every unsupported input class |
| 5.4 | not started | no rule record exists; this order deliberately stops at the crosswalk that a rule record needs |
| 5.5 | not started | the exact two dates and the arithmetic are stated in the register; the implementation order in §11 is the smallest order that could implement them |
| 5.6 | not started | no suite, no replay |
| 5.7 | not reached | 0 admitted governed rules, 0 permitted findings, no finding class created |

The only gate claim in this order is the narrow one in §3, and `SOURCE_CAPTURES\PROD-003\gate_prerequisites.json`
records it beside the state PHASE5-001O itself recorded for every gate. No gate is declared passed as a
whole anywhere in this document.

## 11. The next concrete implementation work order

This is a work order, written in full and **not executed**. It is the smallest implementation the
resulting evidence supports, and it is deliberately narrower than "build a parser".

**`PHASE5-001I-A — the last-payment fact extractor and the six-year evaluator for the single CA-NS unit`**

| Field | Value |
| --- | --- |
| Objective | read one fact from one supported presentation and run one deterministic comparison on it, with nothing consumer-visible |
| In scope | a locator for the `Collections` section and the `Last Payment Date` row of a collection record; a locator for the `Request Date` page header; a raw-value and normalized-value record with a traceable normalization record; one evaluator implementing `intervening_days > six_year_span_in_days` for `CA-NS-CRA-S10-3-C-LIMB-1`; a status model in which `RESOLVED`, `EXTRACTION_UNRESOLVED`, `UNSUPPORTED_PRESENTATION`, `NOT_A_DEBT_RECORD` and `ABSENT_FROM_REPORT` are **distinct states that can never be substituted for one another**; a test suite over the pinned specimen plus negative tests |
| Required negative tests | the period-not-exceeded path (this specimen); a computed positive path from a synthetic **test input** that is never treated as a report; a missing or unreadable label on a `PR-01`-shaped page; an image-only page; a non-`PR-01` document; a document-level read failure; and a generated fixture presented where a report is required, which must be **refused rather than evaluated** |
| Required evidence | every emitted value traceable to page, section, record, label and the pinned specimen digest; identical inputs always produce identical results; no state carries between runs |
| Explicitly out of scope | any consumer-visible output of any class; any second rule unit, jurisdiction or bureau; any second presentation; any change to the coverage ledger, the enumeration, the catalogue or the admitted corpus; any legal re-reading; any deployment, upload, hosting, billing, authentication or external report processing; any use of a subscriber, screening, training or generated artifact as a report |
| Permitted files | a new directory for the evaluator and its tests, plus evidence records in that order's own `SOURCE_CAPTURES` package; nothing else |
| Blocking dependency | the rule record for `CA-NS-CRA-S10-3-C-LIMB-1` does not exist yet (Gate 5.4). The extractor and evaluator may be built and tested against this register's facts; the evaluator may not emit a finding, and the rule may not be admitted, until the owner's rule-corpus amendment records the ceiling in §7.4 and the direct-report contract §4 determination |

**Later orders, named but not written here:** the rule-record and Gate 5.4 order; the validation and
independent-replay order (Gate 5.6); the formal admission order (Gate 5.7). None may be started on the
strength of this one.

## 12. Remaining extraction and evaluation dependencies

| ID | Dependency | Effect | Owner action |
| --- | --- | --- | --- |
| D-1 | the default-in-payment date (`FACT-05`) is unseated on `PR-01` | the rule's second limb is excluded from this unit; a later unit may cover it only if a presentation prints a field the admitted text reads as that date | none required for the first unit |
| D-2 | the locator is demonstrated on **one** specimen only | a second independently authorized Equifax Canada specimen is required before the locator is called reusable | supply a second specimen, or accept the single-specimen boundary in writing |
| D-3 | the rule record does not exist | Gate 5.4 has not begun; the ceiling in §7.4 is a proposal, not an admission | issue the §11 work order |
| D-4 | the effective period of s. 10(3)(c) is unresolved in the admitted record | a plain-English timing qualification is mandatory on any probable output | accept the qualification, or authorize effective-period work |
| D-5 | the recorded legacy `D3` / observation classification diverges from the §4 retention exception this order records | only the owner's rule-corpus amendment can settle which ceiling governs | decide at admission |
| D-6 | no admitted rule and no evaluator exist | no consumer-visible output of any class may be produced | issue §11, then the validation and admission orders |
| D-7 | the positive path is not demonstrated on a real specimen | a positive-path test must be computed from the rule and must never use a generated fixture as a report | none; it is an implementation requirement in §11 |


## 13. Preservation, custody and verification

`SOURCE_CAPTURES\PROD-003\file_custody_manifest.json` pins every file this order created or changed.
`preservation_and_change_record.json` proves preservation by measurement:

| Measure | Result |
| --- | --- |
| pre-existing workspace files | 342 baselined |
| unchanged | **341** — every governing contract, the coverage ledger, the enumeration, the catalogue, every `SOURCE_CAPTURES\PHASE5-*` artifact, every `consumer-wizard\` file and every prior source capture |
| changed | **1** — `CRP_PROD_001_READINESS_AND_IMPLEMENTATION_PLAN.md`, by the owner's amendment (§14) |
| added outside this order / missing | 0 / 0 |
| admitted legacy artifacts re-verified | **34 of 34**, digests matching `admitted_artifacts.json` |
| consumer specimens re-verified | **2 of 2**, digests unchanged |
| generated fixture corpus | 461 files, 23,627,410 bytes, unchanged |
| legacy files created, deleted or modified | **0** |
| verdict | `PRESERVATION HELD` |

**Verification run by `SOURCE_CAPTURES\PROD-003\run_prod003_all.ps1`** (results in `validation_results.json`):

| Step | Result |
| --- | --- |
| 1 input and prerequisite verification | 17 checks, 0 failures (`input_verification.json`) |
| 2 presentation census and extraction | 43 workspace artifacts classified, 0 pinned-hash mismatches, 461 fixtures enumerated, both specimens extracted |
| 3 register and crosswalk build | 28 self-assertions, 0 failures |
| 4 narrative checks | the required sections and facts present, and no forbidden claim (`narrative_check.json`) |
| 5 owner amendment application | 6 amendments applied or already applied, 0 failures; document state `OWNER_DECISION_RECORDED_IN_THE_DOCUMENT` |
| 6 structural tests | **20 tests, 0 failures** (`test_results_crosswalk.json`), including the recomputed date arithmetic, the `EXTRACTION_UNRESOLVED` ≠ `ABSENT_FROM_REPORT` check and the identifier scan |
| 7 demo flow self-check | `node wizard-check.cjs` passes: the application's jurisdiction, sample, review and approval gates still work |
| 8 PROD-002 build check | 38 checks, 0 failures: no region may claim report checking, and no admitted rule or evaluator may be advertised |
| 9 custody and preservation | `PRESERVATION HELD` |

## 14. The governing amendment recorded by this order

One governing document required amendment, and `apply_prod003_amendments.js` applied it under
`CRP_CORE_CONSTITUTION.md` §6.2 (name the document and clause, quote the replaced text, state the
replacement text). The exact texts are in `amendment_text.json`; the application record, with digests, is in
`amendment_application_result.json`.

| Amendment | Document and clause | Effect |
| --- | --- | --- |
| A-1 | `CRP_PROD_001_READINESS_AND_IMPLEMENTATION_PLAN.md` §6.2, the *Admitted rule set* row | the recorded recommendation stands as the audit's finding; the owner decision that broadened selection is inserted beside it |
| A-2 | same, §7.2 proposal P-1 | the proposal's exclusivity is withdrawn; its recorded readiness content stands |
| A-3 | same, §9.3 | the recommendation is restated as the audit's position at its own date, the owner decision is recorded, and the unit selected under it is named |
| A-4 | same, §9.4 milestone M-1 | "the single `US-NY` unit" becomes "the single selected unit", with the owner decision recorded inline |
| A-6 | same, §9.4, the content of milestone M-1 | the milestone's content no longer describes only a medical-debt label; it requires the exact printed label, statement or field the selected unit's rule reads |
| A-5 | same, Amendment History | the amendment row is appended, under §6.5 |

**Not amended, and why.** `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` and
`CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` were searched and contain **no** exclusivity clause
(no occurrence of "single", "US-NY" or "exclusive"), so amending them would have been an implied amendment
of text they do not contain. The `CRP_PUBLIC_REPORT_FORMAT_BASELINE_2026-09-30.md` instruction to keep the
legal effort to the single `US-NY` candidate is a research recommendation inside an artifact whose own
status is "PUBLIC RESEARCH BASELINE / PROPOSED FORMAT SPECIFICATION"; the owner decision supersedes it, and
that artifact is evidence, so it was not rewritten. `CRP_PROD_002_CONSUMER_JURISDICTION_SURFACE.md` §11
already asked for exactly the two artifacts this order produced and needed no change.

## 15. Boundaries

- This document admits no rule, certifies no legal count, re-verifies no legal content and creates no legal
  coverage. It produces no finding for any person.
- It changed one governing document, by the owner's amendment procedure, and nothing else outside its own
  evidence package.
- It did not deploy, publish, host, transmit consumer data, upload a consumer report, evaluate a consumer,
  bill, or add authentication.
- It copied no artifact out of the legacy system, and it reproduces no identifier from any report's content.
- Its machine records are derived and reproducible: `SOURCE_CAPTURES\PROD-003\run_prod003_all.ps1` runs the
  whole chain, and `test_prod003_crosswalk.cjs` fails on any drift between this document's claims and the
  evidence.
- Everything in §4's inventory, §5's boundary, §6's unresolved mappings, §7.4's ceiling and §12's dependency
  list is a recorded limitation. None of them is a finding, a coverage claim or a promise.

## 16. Closing summary

**The selected combination.** Jurisdiction `CA` / `CA-NS`; bureau and channel Equifax, Canada, consumer
channel; presentation `PR-01`, the 22-page Equifax Canada consumer-channel credit report at SHA-256
`E439A4BB…7AE5F`; rule unit `CA-NS-CRA-S10-3-C-LIMB-1`, being `ca-ns.cra.s10_3_c.debt_retention_6y` first
limb (six years from the last payment made on the debt), sourced from the owner-accepted `CRP-LSRC-0354`.
A combination qualifies; nothing here had to be refused for want of evidence, and the unit's ceiling is
`PROBABLE_VIOLATION`, never `VIOLATION`.

**What the evidence supports operationally.** Locating one debt record's printed `Last Payment Date` and
the report's printed request date on one byte-pinned consumer disclosure, and running one deterministic
comparison between them — 1,919 days against a 2,191-day six-year span, `PERIOD_NOT_EXCEEDED` on this
specimen — with every unresolved case refusing rather than guessing. Nothing consumer-visible. Report
checking stays "not yet available" for all 82 regions.

**Remaining extraction and evaluation dependencies.** the second limb's default date is unseated on this
presentation; the locator is demonstrated on one specimen only; the rule record does not exist (Gate 5.4);
the effective period is unresolved, so a timing qualification is mandatory; the recorded legacy `D3` /
observation classification diverges from the §4 retention exception and only the owner's amendment settles
it; there is no admitted rule and no evaluator; and the positive path is not demonstrated on a real
specimen.

**Gate status.** 5.1 met with recorded administrative limitations; 5.2 advanceable, with one of its six
report-mapping routes now evidenced; **5.3 reached for one candidate on one presentation** and passed for
none; 5.4–5.6 not started; 5.7 not reached. No gate is declared passed as a whole.

**The next concrete implementation work order.** `PHASE5-001I-A` — the last-payment fact extractor and the
six-year evaluator for this single unit, with its status model, its negative tests and its explicit
exclusions (§11). Not executed here.

