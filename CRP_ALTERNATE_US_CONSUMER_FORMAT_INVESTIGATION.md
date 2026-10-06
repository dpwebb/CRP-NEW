# Alternate US consumer-format investigation

Date: September 30, 2026. Authority: CRP_OWNER_001J_ALTERNATE_US_CONSUMER_FORMAT_WORK_ORDER.md, issued under explicit owner delegation in chat.

## 1. Outcome and owner disposition

The bounded TransUnion/Equifax investigation is complete. No eligible byte-pinned US consumer disclosure or product-specific consumer field/value reference establishing the required account-level medical representation was obtained. The single US-NY candidate remains unresolved for consumer-format mapping. This is evidence scarcity in this investigation, not a conclusion that real consumer reports lack medical labels.

Owner decisions at completion:

- Close this bounded public search; do not indefinitely repeat the Experian, TransUnion or Equifax searches without a concrete new source.
- Keep the consumer-disclosure input channel unchanged. Do not admit subscriber products as substitutes.
- Preserve US-NY / CRP-LSRC-0194, its probable-only ceiling and all existing timing, preemption, exception and source qualifications. No legal interpretation is changed.
- Do not issue PHASE5-001I mapping on the present evidence. M-1 is pending; the approved plan's Gate 5.2 prerequisite also needs durable verification before Phase 5.3 completion can be claimed.
- Prioritize Equifax's explicit creditor-classification field as the next consumer-format evidence lead **if a new authorized consumer-specific reference becomes available**. This is a research priority, not a supported bureau selection or admission.

Owner delegation permits these research dispositions. It does not make an unseen field, unavailable specimen, missing legal element or missing prior gate true.

## 2. Preservation and methods

Before retrieval, 166 existing Markdown and source-capture files were inventoried by path, byte count and SHA-256. The new work order was excluded as this turn's authorized artifact. Existing root documents, prior baseline, Experian investigation and source/legal captures were read-only. The wizard was neither edited nor accessed for evidence.

Public web search and direct retrieval were used. Original bodies and native-text derivatives were pinned where retrieval succeeded. Relevant PDF pages were rendered with Poppler and visually inspected using the PDF skill. No OCR, parser implementation, evaluator, consumer report acquisition, credentials, sign-in, payment, messages to others or deployment occurred.

Supplemental comparison: a TransUnion-presented training deck hosted by Credit Builders Alliance was inspected for format semantics and authorship. It is not an official consumer-disclosure artifact. No partner-hosted slide was admitted as consumer channel evidence.

Evidence package: SOURCE_CAPTURES/ALTERNATE_US_CONSUMER_FORMAT_INVESTIGATION/. The INVENTORY.md lists exact URLs and hashes; manifests retain actual UTC retrieval times and failed routes. web_observations.json is authored tool-extraction evidence, not a falsely represented copy of source bytes.

## 3. Source inventory and retrieval

| ID | Artifact | Result / evidentiary use |
| --- | --- | --- |
| ALT-001 | TransUnion official consumer guide and inline educational report | Local HTTP 403; readable through web extraction. Inline sample observed, no pinned original |
| ALT-002 | TransUnion subscriber print-image user guide | Local HTTP 403; not consumer channel evidence |
| ALT-003 | Equifax historical consumer online redesign announcement | HTML original pinned; exact sample URL established |
| ALT-004 | Consumer sample URL linked by ALT-003 | DNS failure locally and unsuccessful web opening; no sample obtained |
| ALT-005 | Equifax June 5, 2025 hard-copy redesign announcement | HTML original pinned; establishes format drift and links a promotional image landing page |
| ALT-006 | Credit 101 with TransUnion, CBA-hosted February 20, 2018 webinar | 48-page PDF pinned; presentation semantics only; no consumer-disclosure channel established |
| ALT-007 | Equifax OneView graphical user guide | 30-page PDF pinned; Eport subscriber product; classification dictionary inspected |
| ALT-008 | Equifax OneView text-version user guide | 30-page PDF pinned; Eport subscriber product; account-level medical classification visually located |
| ALT-009 | Promotional image landing page linked by ALT-005 | Local HTTP 400 and unsuccessful web opening; no report layout image obtained |

Totals: 9 requested routes, 3 PDF originals, 2 HTML originals, 4 failed local retrievals. Successful HTML announcements are not consumer report specimens. Failed routes have no invented source hash.

Source URLs:

- TransUnion consumer guide: https://www.transunion.com/how-to-read-your-credit-report
- TransUnion subscriber guide: https://www.transunion.com/docs/rev/business/clientResources/HowToReadCreditReport.pdf
- Equifax historical announcement: https://investor.equifax.com/news-events/press-releases/detail/1102/equifax-releases-enhanced-and-improved-online-credit-report
- Historical sample: https://www.econsumer.equifax.com/otc/sampleProductView.ehtml?prod_cd=CPO
- Current redesign announcement: https://investor.equifax.com/news-events/press-releases/detail/1356/equifax-redesigns-u-s-consumer-credit-report-to-help
- Training presentation: https://cbatraininginstitute.org/wp-content/uploads/2018/08/CBA-Webinar_Credit-101-with-TransUnion_2.20.18.pdf
- Equifax OneView: https://assets.equifax.com/eport/assets/OneViewUserGuide.pdf
- Equifax text version: https://assets.equifax.com/eport/assets/OneView_TextOnly_UserGuide.pdf
- Linked promotional image route: https://mma.prnewswire.com/media/2704281/Equifax_Redesign_US_Consumer_Credit_Report.html

## 4. TransUnion consumer sample observation

The current guide's complete sample is inline HTML, not a separate download. Web extraction identifies a sample report date of June 30, 2025 and an illustrative collection account. Its Original Client Information value is CABLE COMPANY, not a medical designation. The page warns that presentations vary by acquisition source and individual history.

Web-extraction location: sample begins at lines 389–392; Collections account block at lines 541–561. These are tool-extraction locators, not original HTML offsets. The source body could not be pinned locally because retrieval returned 403. No medical consumer marker is established by this inspected collection block. This does not establish universal field absence or reject the entire bureau.

This observation corrects the earlier research limitation without editing the baseline: the sample link's returning to the same URL does not mean no sample exists; it opens material contained in the guide itself.

## 5. TransUnion training semantics

ALT-006 identifies a TransUnion presenter and a February 2018 overview. PDF page 14 (index 13; printed slide 12) explains the original-creditor and creditor-classification fields. It describes replacing an original creditor with MEDICAL for a medical collection, but the pictured collection's value is ABC BANK, with classification 12-FIN. A definition is not a pictured medical collection or a verified consumer-channel field/value dictionary.

The slide was rendered and visually inspected. Other extracted MEDICAL tokens appear in different slide contexts, underscoring that keyword occurrence alone cannot bind a label to the candidate account. Do not promote those tokens into report evidence.

The title and presenter establish bureau-presented educational material, not official consumer-disclosure product provenance. The cover carries CBA noncommercial/share-alike language while the bureau slides carry their own copyright notices. No redistribution or production-fixture licence is inferred.

## 6. Equifax official OneView reference

ALT-008 PDF page 12 (index 11), section 2.7.2, contains a pictured third-party collection with field CREDITOR CLASSIFICATION CODE and value MEDICAL/HEALTH CARE. Its surrounding prose defines the classification as the original creditor's general business type. The medical table is an embedded image: the literal value is not in native page text. No OCR was performed.

Visual locator: enclosing sample image at x0=66.9999924, top=132.9310913, x1=297.037845, bottom=243.8309251 points, on a 612 x 792-point page. This is the table-image boundary, **not an exact field-glyph bounding box**. ALT-008-classification-visual-locator.json records original/render hashes and evidence mode.

ALT-007 page 20 (index 19) lists Medical/Health Care among creditor classifications and was separately rendered and inspected. The guides identify Eport users/member numbers and customer enquiries; their consumer terminology describes the report subject, not proof that it is the consumer's own disclosure. This subscriber evidence is useful, but cannot close the consumer-channel gap.

Any legal statement made within a product guide is recorded only as source wording; it was not used to interpret or change the governed New York rule.

## 7. Five required determinations

| Determination | TransUnion US | Equifax US |
| --- | --- | --- |
| Exact consumer presentation evidenced | PARTIAL: official inline educational sample web-readable, original bytes not pinned | NOT ESTABLISHED: announcements and unavailable historical route; OneView is subscriber |
| Account-level medical marker in consumer presentation | NOT ESTABLISHED: inspected sample collection is nonmedical | NOT ESTABLISHED: medical table is in subscriber guide |
| Official meaning for target consumer product/channel | NOT ESTABLISHED: training explanation does not resolve consumer audience | NOT ESTABLISHED for consumer channel; business-type meaning documented for OneView |
| Reproducible source locator | Web-extraction locator only for nonmedical consumer block; pinned training page separately | YES visual locator for subscriber sample image; no consumer medical locator |
| Sufficient for required consumer mapping | NO | NO |

An unavailable specimen is not evidence that the consumer report lacks a relevant fact. A pictured subscriber field is not a field extracted from a consumer upload. A classification of creditor business type is not automatically proof of the debt's legal character or of any exception.

## 8. Search limits and retained boundaries

Official-site searches covered consumer sample reports, disclosure routes, original creditor, medical labels and creditor classification. Dead historical routes and announced redesigns were followed only through observed links. No inaccessible route was repeatedly retried or bypassed. Speculative URL construction, logins, private reports and source substitution were avoided.

A search surfaced a named real-person report on a government website. It was not opened or downloaded: public indexing is not authorization to use someone's credit report. Forum and document-sharing reports were also not used. Other-country samples and subscriber field guides remain separate evidence classes.

No law was retrieved for new interpretation. No reporting period, bureau-policy threshold, preemption resolution, effective date or credit-card exception was determined here. Source discovery and field representation do not admit rules or govern consumers' jurisdiction.

## 9. Completion and next dependency

OWNER-001J is complete as a bounded documentation investigation. The approved plan itself requires a candidate to have a verifiable representation or an explicitly source-grounded unresolved/excluded disposition. This report supplies the latter research disposition for the examined presentations, not a corpus-wide Gate 5.3 completion declaration.

The next meaningful dependency is consumer-channel evidence for the explicit classification/description. Resume this unit only upon a concrete eligible artifact or consumer-specific authoritative reference, with existing prior gates verified. Keep Equifax creditor classification as the documented lead. Further generic public-sample searching has no current authorized purpose after this disposition; no channel expansion or weaker evidence inference is issued.

Existing readiness/legal artifacts retain their recorded zero admitted rules, zero governed-jurisdiction coverage and zero permitted findings. No PHASE5-001I mapping register, evaluator, parser, website change or deployment is created by this order.
