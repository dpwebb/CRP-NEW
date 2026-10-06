# Owner direction — failure-to-detect mitigation

Date: October 2, 2026, America/Halifax.
Authority: human owner explicitly requested recording these procedures for implementation at the earliest convenience.
Status: required implementation follow-up in the active acceptance program; recorded, not yet implemented or deployed by this note.

## Priority and scope

Incorporate these procedures into the earliest compatible ingestion/assessment batch without restarting active work or overwriting concurrently owned files. Prioritize facts whose missed detection prevents useful applicable assessments. Reuse the existing local extraction pipeline and reported-fact policy. This direction does not authorize external transmission of private reports, new finding permissions or a production deployment.

## Required procedures

1. Recognize equivalent wording, documented bureau abbreviations and codes. Preserve raw text and source locations. Do not equate semantically different events or use undifferentiated keyword matching as the sole extractor.
2. Read structure and context: account boundaries, tables, nearby labels, headings and continued pages. Distinguish actual record content from boilerplate, rights notices, examples and explanatory guides.
3. Check extraction completeness automatically: unread pages, truncated sections, empty OCR, cropped material and missing continuations. A readable page is not proof that every relevant field was resolved.
4. Use bounded targeted recovery: native text first where useful, then local page/crop OCR or an alternative supported reading when material evidence is uncertain. Preserve original bytes and processed-image relationships. Compare readings; retain contradictions rather than silently selecting a convenient value. Set and test recovery limits for time, memory and page count.
5. Corroborate within the report using summaries, record details and payment-history sections only when the same record is reliably identified. Never borrow facts across accounts or reports. Corroboration must preserve conflicting evidence.
6. Benchmark missed facts and incorrectly confident readings using designated examples covering alternate wording/codes, unfamiliar layouts, rotated/degraded scans, low contrast, boilerplate and page continuations. Measure by bureau, format and assessment-relevant field. Keep development and evaluation examples separate where practical. Third-party and synthetic examples retain their designations; their success is not proof of universal accuracy.
7. Record privacy-safe internal reasons for withheld checks and recovery outcomes to prioritize repairs. Do not log report text or personal identifiers. Aggregate metrics must distinguish successful upload, resolved field extraction, actual check execution and valid classification.

## Consumer effort and interpretation

Ask a consumer only after bounded automatic recovery, for a simple visible fact whose clarification materially enables a useful assessment. Provide skip and cannot-tell options; preserve independently workable checks. Never ask the consumer to interpret legal requirements or bureau semantics. Do not require a general review of all extracted fields.

## Mandatory acceptance boundary

Failure to detect is not proof of absence. Extraction failure cannot support a finding or establish a genuinely unavailable decisive fact. A statement of absence requires an adequately resolved examination of the relevant report content, not merely unsuccessful keyword search. Missing information establishes breach only where the applicable duty and its conditions are also established. An unperformed check must not appear as no issue found.

## Completion evidence

For each affected check demonstrate present/equivalent wording detected, unrelated context ignored, unreadable content unresolved, targeted recovery effective, and contradiction preserved. Compare missed-fact and incorrect-reading rates against a recorded baseline. Verify affected PDF and image consumer journeys on staging and update CRP_FINAL_ACCEPTANCE_REGISTER_PLAIN_ENGLISH.md with exact build, tests, measured outcomes and remaining limitations. Keep incomplete items open.
