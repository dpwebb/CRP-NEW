# Optional enhancement backlog

All entries in this document are optional future enhancements. They are NOT production blockers, gaps, or release acceptance requirements and must not be added to release-check gates or increase the blocker count. Listing an enhancement does not authorize immediate implementation or an automatic scheduled run. Existing required capabilities retain their independently defined acceptance criteria.

## ENH-SCALE-001 — Report scale resilience testing

Owner direction recorded: October 2, 2026.

Status: BACKLOG — optional possible enhancement, scheduled for consideration after required implementation work. No calendar deadline or automatic run is assigned.

This item is NOT a production blocker, NOT a gap, and NOT a release acceptance requirement. It must not be added to release-check gates or increase the blocker count.

Scope: test equivalent public/synthetic credit-report PDFs and images at different uniform scales and resolutions. Compare account association, date extraction and payment-history grid cells against independently recorded expected facts. Include readable enlarged/reduced versions and versions made unreadable by reduction. Verify that unreadable information remains uncertain rather than producing invented facts.

Preserve relative-layout interpretation and evidence locations; do not introduce hard-coded coordinate templates. Record measured outcomes before deciding whether further implementation is useful. Use local processing and public/synthetic fixtures, without private consumer-report transmission.

Authority: the Owner explicitly requested scheduling this scale resilience test as a possible enhancement, not a production blocker or gap.

## Additional optional enhancements

Owner direction recorded: October 2, 2026. Status for every item below: BACKLOG — consideration after required implementation work; no calendar deadline assigned.

| ID | Enhancement | Proposed scope and consumer benefit |
| --- | --- | --- |
| ENH-IMAGE-001 | Automatic image orientation and deskew | Handle sideways or tilted report photos through bounded local correction, preserving originals and evidence-location mapping. |
| ENH-PHOTO-001 | Photo-quality preview | Identify likely glare, cropped edges or blur before upload and offer simple retake guidance without claiming authenticity or reliable extraction from the preview alone. |
| ENH-PAGES-001 | Suggested page ordering | Suggest ordering using printed page numbers and report context; preserve originals and leave uncertain ordering unchanged. |
| ENH-EVIDENCE-001 | Click-to-view evidence | Open the relevant report excerpt beside an assessment, subject to existing account-access controls. This is an optional viewing convenience beyond required source-linked evidence. |
| ENH-COMPARE-001 | Compare successive reports | Show entries that changed, disappeared or remained after a dispute, preserving bureau and reporting-date distinctions and uncertain account matches. A change alone does not prove compliance or a violation. |
| ENH-RESUME-001 | Save and resume uploads | Allow consumers to finish large report uploads later without restarting, while preserving privacy, quotas and honest incomplete-set status. |
| ENH-ACCESS-001 | Accessible report explanations | Offer larger text, keyboard navigation and brief explanations of unfamiliar report terms as optional improvements; existing mandatory accessibility obligations are not reclassified by this entry. |

Suggested consideration priority: automatic image orientation, photo-quality preview and click-to-view evidence. This preference creates no release dependency.

Authority: the Owner explicitly requested adding these seven suggestions to the optional enhancements list, not as production blockers or gaps.

## Additional application enhancements — October 2, 2026

Status: BACKLOG — optional consideration after required work, without a calendar deadline or automatic run.

| ID | Enhancement | Proposed scope and consumer benefit |
| --- | --- | --- |
| ENH-REMINDERS-001 | Consumer-controlled reminders | Help track follow-up dates through opt-in reminders; no automatic bureau contact or inferred legal deadline. Any external notification delivery requires separately authorized destination and data. |
| ENH-TIMELINE-001 | Case progress timeline | Present uploads, assessments and consumer actions chronologically, retaining actual event dates and provenance. |
| ENH-PDF-001 | Accessible PDF assessment | Offer a readable, printable PDF with evidence references and clear distinctions between findings and observations, beyond the required working assessment download. |

Owner direction: these three remain optional, NOT production blockers or gaps. Results prioritization, explanation cards, billing dashboard, privacy dashboard and privacy-safe support references are instead mandatory OPEN production blockers under build-plan section 8.3; they are not optional entries.
