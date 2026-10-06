/**
 * build_001o_gate_and_order.js — writes gate_reassessment_001o.json and next_work_order.json.
 *
 * Every figure is read from the artifacts this order produced, so the reassessment cannot drift from the
 * measured coverage ledger.
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib_001o.js");

const summary = JSON.parse(L.read(path.join(L.OUT, "coverage_summary.json")));
const ledger = JSON.parse(L.read(path.join(L.OUT, "source_id_coverage_ledger.json")));
const amendments = JSON.parse(L.read(path.join(L.OUT, "amendment_text.json")));
const rows = ledger.rows;

const accepted = summary.owner_acceptance.OWNER_ACCEPTED_LEGAL_AUTHORITY;
const notStatute = summary.owner_acceptance.ACCEPTED_AS_RECORDED_MATERIAL_NOT_AS_A_STATUTE;
const noStatute = summary.owner_acceptance.NOT_ACCEPTED_NO_STATUTE_RECORDED;
const mappedRows = rows.filter((r) => r.existing_operational_mapping.state === "ESTABLISHED").length;
const multiMapped = rows.filter((r) => r.existing_operational_mapping.state === "ESTABLISHED_MULTIPLE_RECORDED_ROWS").length;
const unmapped = rows.filter((r) => r.existing_operational_mapping.state === "NOT_ESTABLISHED").length;
const regionsWithContent = Object.entries(summary.per_jurisdiction).filter(
  ([k, v]) => /^(US|CA|GB|AU)-/.test(k) && (v.content_rule > 0 || v.limitation_record > 0),
).length;

const layer1 = {
  id: 1,
  name: "LEGAL_AUTHORITY_ACCEPTED_BY_THE_OWNER",
  state: "ACCEPTED",
  basis: "owner directive PHASE5-001O recorded in CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md section 3.1",
  measured: { accepted_entries: accepted, accepted_as_recorded_material_not_as_a_statute: notStatute, no_statute_recorded: noStatute, ledger_rows: rows.length },
  remaining: [],
  notes:
    "No provenance, historical-version or prior-review proof is required, and no legal validity was reopened. The acceptance is owner-directed; this order performed no independent legal verification.",
};

const layer2 = {
  id: 2,
  name: "ADMINISTRATIVE_RECONCILIATION",
  state: "RECORDED_WITH_LIMITATIONS_NOT_BLOCKING",
  basis: "amended Gate 5.1, amended Phase 5.1 bullets 3 and 5, amended build-plan section 5 stop condition, Corpus Contract section 5",
  measured: {
    register_dispositions: summary.register_disposition,
    unresolved_duplicate_identity_rows: ["CRP-LSRC-0409", "CRP-LSRC-0411"],
    unique_legal_provision_count: "NOT_CERTIFIED",
    entries_with_unestablished_legacy_mapping: unmapped,
    entries_with_section_not_verified_in_the_legacy_registry: summary.dependency_frequency.SECTION_NOT_VERIFIED_IN_THE_LEGACY_REGISTRY || 0,
  },
  remaining: [
    "The corpus-wide unique legal-provision count remains uncertified: an administrative limitation, not a blocker.",
    "The CRAIN pair CRP-LSRC-0409/0411 remains IDENTITY_UNRESOLVED: an administrative limitation, not a blocker.",
    "The 61 entries with no exact recorded legacy mapping remain NOT_ESTABLISHED: a mapping task, not a reason to reject an accepted statute.",
  ],
  notes:
    "The directive makes these bookkeeping outcomes recordable limitations. They no longer hold the sequence, and they are not a reason to run another count or provenance investigation as the next step.",
};

const layer3 = {
  id: 3,
  name: "REPORT_FORMAT_AND_APPLICATION_DEPENDENCIES",
  state: "OPEN",
  basis: "Gate 5.2, Gate 5.3, the consumer-selection jurisdiction contract and the consumer application's current selector",
  measured: {
    regions_with_accepted_content: regionsWithContent,
    canonical_regions_appearing_in_the_ledger: summary.enumeration_coverage.canonical_regions_appearing_in_the_ledger,
    canonical_regions_with_no_ledger_row: summary.enumeration_coverage.canonical_regions_with_no_ledger_row,
    application_selector_regions: summary.application_alignment.wizard_region_count,
    canonical_regions_absent_from_the_application: summary.application_alignment.canonical_regions_absent_from_the_wizard.length,
    entries_with_a_country_wide_relation_to_resolve: summary.dependency_frequency.COUNTRY_WIDE_TO_SELECTED_REGION_RELATION_REQUIRED || 0,
  },
  remaining: [
    "Drive the consumer application's selectable jurisdiction list from CRP-JURISDICTION-ENUM-1 instead of the hard-coded display-name list.",
    "Resolve each country-wide source to an exact selected region where a rule needs it (100 entries are recorded as country-wide).",
    "For any rule that depends on a report representation, produce the exact field/event/location mapping (Gate 5.3 remains evidence-gated).",
  ],
  notes: "This layer is product work on the accepted corpus. It is not legal-provenance research, and it does not require the uncertified provision count.",
};

const layer4 = {
  id: 4,
  name: "READINESS_FOR_DETERMINISTIC_EVALUATION",
  state: "NOT_READY",
  basis: "Gate 5.4 to Gate 5.7",
  measured: {
    accepted_provisions_available_for_rule_records: accepted,
    operational_mapping_established: mappedRows,
    operational_mapping_established_multiple_rows: multiMapped,
    admitted_governed_legal_rules: 0,
    permitted_legal_findings: 0,
  },
  remaining: [
    "Construct complete rule records for accepted provisions under the governed-corpus contract.",
    "Build deterministic evaluators, the validation suite and the independent replay, then admit rules by owner amendment.",
  ],
  notes: "Gated on layer 3 for every rule whose test depends on a report representation. Not gated on layer 2.",
};

module.exports = { summary, ledger, amendments, rows, accepted, notStatute, noStatute, mappedRows, multiMapped, unmapped, regionsWithContent, layer1, layer2, layer3, layer4 };


const gate = {
  artifact: "gate_reassessment_001o.json",
  work_order: "PHASE5-001O",
  created_utc: "2026-09-30",
  purpose:
    "reassess the Phase 5 gate sequence under the amended authority, separating legal authority accepted by the owner from administrative reconciliation, report-format/application dependencies, and readiness for deterministic evaluation",
  authority_basis: [
    "CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md section 3.1 (added by PHASE5-001O)",
    "CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md section 3 condition 5 and the section 6 owner direction (amended by PHASE5-001O)",
    "CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md owner directive paragraph, section 3 and section 5 (amended by PHASE5-001O)",
    "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md sections 2.1, 3 (Phase 5.1 and Gate 5.1), 5 and 6 (amended by PHASE5-001O)",
    "CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md section 5 (amended by PHASE5-001O)",
  ],
  layers: [layer1, layer2, layer3, layer4],
  gate_status: {
    "5.1": {
      requirement_now: "Amended Gate 5.1 text (amendment D-3 in amendment_text.json).",
      state: "MET_WITH_RECORDED_ADMINISTRATIVE_LIMITATIONS",
      evidence: [
        "437 catalogue IDs accounted for once in the PHASE5-001K register and restated in this order's coverage ledger.",
        "Duplicate links explicit per relation and per row (PHASE5-001L), with the 25 unresolved relations determined by PHASE5-001N.",
        "Unresolved count and duplicate identity recorded as administrative limitations under the amended rule.",
      ],
    },
    "5.2": {
      requirement_now: "Unchanged.",
      state: "ADVANCEABLE_FROM_THE_ACCEPTED_CORPUS",
      evidence: [
        "Per-ID dispositions exist in the register, and the coverage ledger now also records per ID the accepted provision, the jurisdiction association, the reporting purpose and the legacy operational mapping.",
        "The six B20 mapping IDs remain pending their exact report-field/event mapping: layer 3 work, unchanged.",
      ],
    },
    "5.3": {
      requirement_now: "Unchanged; evidence-gated.",
      state: "STILL_EVIDENCE_GATED",
      evidence: ["No eligible byte-pinned consumer disclosure carrying the required account-level representation has been obtained; this order did not attempt it and was not authorised to."],
    },
    "5.4": { requirement_now: "Unchanged.", state: "NOT_STARTED", evidence: ["Rule-record construction has not begun."] },
    "5.5": { requirement_now: "Unchanged.", state: "NOT_STARTED", evidence: [] },
    "5.6": { requirement_now: "Unchanged.", state: "NOT_STARTED", evidence: [] },
    "5.7": { requirement_now: "Unchanged.", state: "NOT_REACHED", evidence: ["No rule is admitted."] },
  },
  what_changed_and_what_did_not: {
    changed_by_the_directive: [
      "Layer 1 no longer requires provenance, historical-version or prior-review proof.",
      "Layer 2 bookkeeping no longer holds the sequence.",
      "The default next step is implementation on the accepted corpus, not legal-provenance research or another duplicate-count investigation.",
    ],
    unchanged: [
      "Gate 5.3 and later still need report representation and exact location evidence.",
      "No finding may be emitted without admitted rules and a passed evaluator; consumers still receive only violations and probable violations.",
      "The consumer-uploaded report remains the sole consumer-evidence input, and no additional evidence may be requested.",
    ],
  },
  recorded_tensions_not_resolved_by_this_order: [
    { id: "C-1", carried_from: "PHASE5-001N", detail: "The recorded instrument_title 'PIPEDA' for CRP-LSRC-0315/0316/0317/0318/0320 is unsupported by the recorded FCAC locator and by the official PIPEDA consolidation.", action: "reported, not rewritten; the entries keep their recorded content and are accepted as recorded under the owner directive" },
    { id: "C-2", carried_from: "PHASE5-001N", detail: "The CRAIN pair records two different starts and the retrieved table reproduces neither.", action: "retained as IDENTITY_UNRESOLVED with the missing fact named" },
    { id: "C-3", carried_from: "PHASE5-001N", detail: "The official route for the CRP-LSRC-0165/0166 provision is blocked by a challenge page.", action: "route limitation recorded on the determination" },
    { id: "C-4", carried_from: "PHASE5-001N", detail: "The Ontario e-Laws statute route returns an application shell.", action: "instrument-level determination recorded" },
    { id: "C-5", raised_by_this_order: true, detail: "CRP_PHASE5_NEXT_GATE_RECONCILIATION.md (rank 6) lists P-4 'duplicate links explicit' and P-8 'source pin re-verified' as prerequisites and restates the pre-amendment stop condition for counts and provenance.", action: "read as subordinate to the amended rank-4 and rank-5 text: P-4 is satisfied by the amended Gate 5.1 recording of limitations, and P-8 concerns the source pin of a finding-capable rule unit, which remains required for a finding and is not an acceptance prerequisite. That document is not amended, because it is an analysis artifact and the governing meaning now sits in the amended contracts." },
  ],
  boundaries: ["No gate is declared passed beyond the amended Gate 5.1 recording. No rule, coverage, candidate or finding was created."],
  amendments_made_by_this_order: amendments.amendment_count,
  created_by: "PHASE5-001O",
};

fs.writeFileSync(path.join(L.OUT, "gate_reassessment_001o.json"), JSON.stringify(gate, null, 2), "utf8");
console.log("gate reassessment written; regions with accepted content:", regionsWithContent, "| accepted:", accepted);

// ---------------------------------------------------------------- next work order
const regionList = Object.entries(summary.per_jurisdiction)
  .filter(([k, v]) => /^(US|CA|GB|AU)-/.test(k) && (v.content_rule > 0 || v.limitation_record > 0))
  .map(([k, v]) => ({ region_code: k, accepted: v.accepted, content_rules: v.content_rule, limitation_records: v.limitation_record, mapped: v.mapped }))
  .sort((a, b) => a.region_code.localeCompare(b.region_code));

const order = {
  artifact: "next_work_order.json",
  work_order: "PHASE5-001O",
  created_utc: "2026-09-30",
  purpose: "recommend, without performing it, the smallest concrete implementation work order that advances the consumer application using the accepted corpus",
  what_this_order_does_not_authorise:
    "PHASE5-001O does not authorise this work order. Application changes, deployment, consumer-data transmission and findings about an actual consumer remain unauthorised until the owner issues it. Report facts and jurisdiction applicability still need a supported operational basis, and no legal finding may be produced.",
  recommended_order: {
    working_title: "PROD-002 — Consumer Application Jurisdiction Surface From the Accepted Corpus",
    objective:
      "make the consumer application's selectable jurisdiction list come from CRP-JURISDICTION-ENUM-1, and state for each selectable jurisdiction the coverage the accepted legacy corpus records, generated from this order's coverage ledger rather than hard-coded",
    why_this_is_the_smallest_concrete_step: [
      "It uses only the accepted corpus and the approved enumeration: no new legal research and no count certification.",
      "It is independent of the evidence-gated Gate 5.3 dependency (report representation), so it can proceed now.",
      "The gap it closes is measured below: the application's selector omits canonical regions and carries no canonical codes.",
      "It produces a reviewable artifact (a generated jurisdiction/coverage data file plus the selector change) with no consumer data involved.",
    ],
    measured_inputs: {
      canonical_regions: summary.application_alignment.canonical_region_count,
      canonical_regions_appearing_in_the_ledger: summary.enumeration_coverage.canonical_regions_appearing_in_the_ledger,
      canonical_regions_with_at_least_one_accepted_entry: summary.enumeration_coverage.canonical_regions_with_at_least_one_accepted_entry,
      canonical_regions_with_no_ledger_row: summary.enumeration_coverage.canonical_regions_with_no_ledger_row,
      application_selector_regions: summary.application_alignment.wizard_region_count,
      canonical_regions_absent_from_the_application: summary.application_alignment.canonical_regions_absent_from_the_wizard,
      regions_with_accepted_content: regionsWithContent,
      accepted_entries_available: accepted,
      entries_to_resolve_to_a_selected_region: summary.dependency_frequency.COUNTRY_WIDE_TO_SELECTED_REGION_RELATION_REQUIRED || 0,
    },
    scope_in: [
      "generate, from SOURCE_CAPTURES/PHASE5-001O/source_id_coverage_ledger.json, one derived data file listing every canonical region from CRP-JURISDICTION-ENUM-1 with the counts of accepted provisions the corpus records for it, and an explicit empty state where none is recorded",
      "change the consumer application's jurisdiction selector to that enumeration (canonical country and region codes, source display names), removing the hard-coded display-name list",
      "state on the consumer surface, in plain language, that the coverage shown is owner-accepted legacy statutory coverage, that no legal finding has been produced for the consumer, and that a selected jurisdiction is not a finding",
      "add a check that fails the build if the generated file and the ledger disagree",
    ],
    scope_out: [
      "any change to a governing document, the catalogue, the register, the legacy corpus, or the coverage ledger",
      "any legal-provenance research, source retrieval, or duplicate-count investigation",
      "report parsing, report facts, evaluators, findings, probable findings, or consumer-facing conclusions",
      "deployment, hosting changes, payments, and any transmission of real consumer data",
      "certifying any count as a legal-provision count",
    ],
    provisional_region_surface: regionList,
    acceptance_criteria: [
      "every selectable jurisdiction on the consumer surface is a canonical CRP-JURISDICTION-ENUM-1 code, and no non-enumerated value is selectable",
      "the displayed coverage per jurisdiction is generated from the accepted-corpus ledger and states its own limits (uncertified provision count; country-wide sources not yet related to a region)",
      "no legal finding, probable finding, deadline or conclusion appears anywhere in the application output",
      "the preservation check shows that no governing document, catalogue, register or legacy file changed",
    ],
    stop_conditions: [
      "the owner has not issued the order or has not authorised application changes",
      "an implementation need would require a non-enumerated jurisdiction, a country-wide relation the corpus does not record, or a legal proposition the corpus does not record: record it as an implementation dependency instead of supplying a value",
      "the change would touch consumer data, deployment, or a finding path",
    ],
    dependencies_recorded_and_not_blocking: [
      "the unique-legal-provision count is uncertified (administrative limitation)",
      "CRP-LSRC-0409/0411 duplicate identity is unresolved (administrative limitation)",
      "61 entries have no exact recorded legacy operational mapping (mapping task)",
    ],
  },
  alternatives_considered_and_rejected_as_the_next_step: [
    "another legal-provenance or official-source retrieval order: excluded by the owner directive and unnecessary for layer 1",
    "another duplicate-count or unique-provision count order: excluded by the owner directive as bookkeeping",
    "a report-format search order: still blocked on unavailable evidence and not the smallest advanceable step",
  ],
  created_by: "PHASE5-001O",
};

fs.writeFileSync(path.join(L.OUT, "next_work_order.json"), JSON.stringify(order, null, 2), "utf8");
console.log("next work order written; provisional region surface rows:", regionList.length);
