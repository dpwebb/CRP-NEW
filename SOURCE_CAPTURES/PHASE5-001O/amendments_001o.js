/**
 * amendments_001o.js — the exact amendment set performed by PHASE5-001O.
 *
 * For an INSERT the block is extracted from the amended file between two markers, so the quotation in
 * the record is taken from the file rather than retyped. For a REPLACE, the replaced and replacement
 * sentences are quoted from the edit this order performed.
 */
module.exports = {
  replace: [
    {
      id: "A-2",
      document: "CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md",
      clause: "section 4, Current Legal-Coverage State, the state block",
      replaced_text: "ADMITTED LEGACY SOURCE ARTIFACTS: 34\nRE-EXPRESSED GOVERNED LEGAL RULES: 0",
      replacement_text:
        "ADMITTED LEGACY SOURCE ARTIFACTS: 34\nLEGACY LEGAL CONTENT ACCEPTED BY THE OWNER: OWNER_ACCEPTED_LEGAL_AUTHORITY\nRE-EXPRESSED GOVERNED LEGAL RULES: 0",
    },
    {
      id: "B-1",
      document: "CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md",
      clause: "section 3, Eligible Source Scope, condition 5",
      replaced_text: "5. Its legal effect and temporal applicability can be pinned to an identifiable source version.",
      replacement_text:
        "5. Its legal effect and temporal applicability can be pinned to an identifiable source version. A digest-bound certified-baseline record admitted under `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md` satisfies this condition as the source pin even when the formal statutory publication or historical version is not recorded: an unrecorded formal edition is recorded as an administrative limitation and is not, by itself, a ground to exclude the source.",
    },
    {
      id: "D-1",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause: "section 3, Phase 5.1, bullet 3",
      replaced_text:
        "- Record the unique legal-provision key and explicit canonical/duplicate links. Count source records separately from unique legal provisions; do not infer duplication from adjacent IDs.",
      replacement_text:
        "- Record the unique legal-provision key and explicit canonical/duplicate links. Count source records separately from unique legal provisions; do not infer duplication from adjacent IDs. Under owner directive PHASE5-001O these counts and links are administrative bookkeeping: an unresolved duplicate identity or an uncertified unique-legal-provision count is recorded as an administrative limitation and does not block acceptance of the accepted legacy statutes or coverage planning.",
    },
    {
      id: "D-2",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause: "section 3, Phase 5.1, bullet 5, final clause",
      replaced_text:
        "so those clusters remain open and queued, neither collapsed, merged nor re-classed, and no unique-legal-provision count may be certified while they stand unresolved.",
      replacement_text:
        "so those clusters remain open and queued, neither collapsed, merged nor re-classed. Under owner directive PHASE5-001O the uncertified unique-legal-provision count and the open duplicate bookkeeping are administrative limitations that are recorded rather than treated as blocking: they do not prevent the remaining phases of this plan, coverage planning, or the next implementation work order, and no count is published as certified.",
    },
    {
      id: "D-3",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause: "section 3, Gate 5.1, first sentence",
      replaced_text:
        "**Gate 5.1:** every source ID is accounted for once, all counts reconcile, duplicate links are explicit, and no unresolved item was silently excluded.",
      replacement_text:
        "**Gate 5.1:** every source ID is accounted for once, all counts reconcile to the extent the recorded evidence permits, duplicate links are explicit, and no unresolved item was silently excluded. Under owner directive PHASE5-001O a count or duplicate identity that cannot be reconciled is recorded as an explicit administrative limitation with the evidence it rests on, and that recording satisfies this condition: the limitation does not block the remaining phases, coverage planning, or the next implementation work order.",
    },
    {
      id: "D-4",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause: "section 5, stop conditions, final bullet",
      replaced_text: "- counts, duplicate identity, or source provenance cannot be reconciled.",
      replacement_text:
        "- a count, a duplicate identity, or a source-provenance question cannot be reconciled after a genuine attempt: under owner directive PHASE5-001O it is recorded as an explicit administrative limitation with the evidence it rests on and the work does not stop for it. Only a concrete source conflict, an amendment/repeal/supersession indicator, or an identified record inconsistency that changes legal content is a stop condition.",
    },
    {
      id: "D-5",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause: "section 2.1, item 1",
      replaced_text:
        "1. The exact legal text is pinned to an official source or an admitted digest-bound certified legacy baseline; citation, jurisdiction, and source provenance are recorded.",
      replacement_text:
        "1. The exact legal text is pinned to an official source or an admitted digest-bound certified legacy baseline; citation, jurisdiction, and source provenance are recorded where the accepted corpus records them. Under owner directive PHASE5-001O a source whose formal edition, historical version or prior-review record is not recorded is not rejected for that reason: the digest-bound accepted source is the pin, and the missing record is an administrative limitation stated with the finding. The report-side requirements of this section are unchanged.",
    },
  ],
  insertAfter: [
    {
      id: "A-1",
      document: "CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md",
      clause: "section 3, new subsection 3.1",
      anchor_text:
        "remain permanently excluded.",
      start_marker: "### 3.1 Owner acceptance of the designated legal content (PHASE5-001O)",
      end_marker: "## 4. Current Legal-Coverage State",
    },
    {
      id: "B-2",
      document: "CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md",
      clause: "section 6, new owner-direction subsection",
      anchor_text: "This rule classifies a source-discovery candidate only.",
      start_marker: "### Owner direction: acceptance, duplicate bookkeeping and coverage planning (PHASE5-001O)",
      end_marker: "A discovery record is source research only.",
    },
    {
      id: "C-1",
      document: "CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md",
      clause: "preamble, new owner directive paragraph after the PHASE5-001A ruling",
      anchor_text: "report-only evaluation gates pass.",
      start_marker: "**Owner directive PHASE5-001O:**",
      end_marker: "## 1. Purpose and Boundary",
    },
    {
      id: "C-2",
      document: "CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md",
      clause: "section 5, counting sentence",
      anchor_text: "Source-record counts and unique legal-rule counts must be reported",
      start_marker: "Source-record counts and unique legal-rule counts are administrative bookkeeping.",
      end_marker: "## 6. Admission and Change Control",
    },
    {
      id: "C-3",
      document: "CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md",
      clause: "section 3, certified-baseline acceptance",
      anchor_text: "may no longer represent applicable law.",
      start_marker: "For a certified-baseline record, acceptance is governed by",
      end_marker: "Commentary, summaries, model output",
    },
    {
      id: "E-1",
      document: "CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md",
      clause: "section 5, after the unresolved-provenance table",
      anchor_text: "unfit for governed-rule construction. |",
      start_marker: "Under owner directive PHASE5-001O these two items are implementation dependencies",
      end_marker: "## 6. Non-Applicability",
    },
    {
      id: "D-6",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause: "section 6, gate-sequence reassessment and next work order",
      anchor_text: "pausing only for a material owner/legal decision.",
      start_marker: "**Owner directive PHASE5-001O — gate-sequence reassessment.**",
      end_marker: "## 7. Scope boundary",
    },
  ],
  append: [
    { id: "A-3", document: "CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md", clause: "section 5, Amendment History, appended row", marker: "| 2026-09-30 | PHASE5-001O |" },
    { id: "B-3", document: "CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md", clause: "section 9, Amendment History, appended row", marker: "| 2026-09-30 | PHASE5-001O |" },
    { id: "C-4", document: "CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md", clause: "section 8, Amendment History, appended row", marker: "| 2026-09-30 | PHASE5-001O |" },
    { id: "E-2", document: "CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md", clause: "section 7, Amendment History, appended row", marker: "| 2026-09-30 | PHASE5-001O |" },
    { id: "D-7", document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md", clause: "section 8, Amendment History, appended row", marker: "| 2026-09-30 | PHASE5-001O |" },
  ],
};
