/**
 * build_001p_scope_definition.js — writes scope_definition.json for PHASE5-001P.
 *
 * The owner selected the scope; this record names it in the form the amended plan requires (jurisdiction,
 * rule unit, statutory limb, report presentation, evidence references, exclusions) so that every scoped
 * verdict issued in this order is bounded by the record rather than by preference.
 */
const fs = require("fs");
const path = require("path");

const ROOT = "C:\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001P");

const scope = {
  artifact: "scope_definition.json",
  work_order: "PHASE5-001P",
  created_utc: "2026-09-30",
  purpose:
    "name the one scope the owner selected, so that each scoped gate verdict this order records is read against an explicit jurisdiction, rule unit, limb, presentation, evidence set and exclusion list",
  scope_id: "SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT",
  owner_selection_as_recorded: [
    "CA / CA-NS",
    "CA-NS-CRA-S10-3-C-LIMB-1",
    "Last-payment limb only",
    "PR-01 exact byte-pinned specimen",
    "Observation-only, packet-ineligible",
  ],
  jurisdiction: {
    country_code: "CA",
    region_code: "CA-NS",
    enumeration: "CRP-JURISDICTION-ENUM-1 (82 first-level region records)",
    authority_rule_quoted:
      "Jurisdiction is never inferred. The analysis jurisdiction is the consumer's pre-upload COUNTRY + REGION selection. (CRP_CORE_CONSTITUTION.md 4.1)",
    note: "this scope names the jurisdiction; it infers none from the report's content, and the specimen is not used as a jurisdiction signal",
  },
  rule_unit: {
    id: "CA-NS-CRA-S10-3-C-LIMB-1",
    definition_quoted:
      "A rule unit is one independently testable legal proposition for one exact jurisdiction and statutory limb. (build plan section 3, Phase 5.4)",
    source_entry_id: "CRP-LSRC-0354",
    legacy_rule_id: "ca-ns.cra.s10_3_c.debt_retention_6y",
    instrument: "Consumer Reporting Act (Nova Scotia), R.S.N.S. 1989, c. 93, s. 10(3)(c)",
    source_pin:
      "packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts, SHA-256 90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF, unchanged; legal content accepted by the owner as OWNER_ACCEPTED_LEGAL_AUTHORITY (PHASE5-001O)",
    limb_in_scope: "the last-payment limb only — six years from the last payment made on the debt",
    limb_out_of_scope:
      "the second limb (no payment made on the debt: six years from the date the default in payment occurred). It is excluded from this scope because the presentation prints no field the admitted text reads as that date (PROD-003 field_records FACT-05, status EXTRACTION_UNRESOLVED for PR-01).",
  },
  presentation: {
    presentation_id: "PR-01",
    artifact_id: "LEG-CONSUMER-EQ-CA",
    publisher: "Equifax (Canada, consumer channel)",
    audience: "CONSUMER",
    sha256: "E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F",
    bytes: 96393,
    pages: 22,
    page_size: "594.96 x 841.92 pts (A4)",
    native_text_pages: 22,
    read_mode: "read-only in place from outside this repository through the pointer recorded by PROD-003; nothing copied, moved, renamed or transmitted",
    admission_boundary_quoted:
      "This one artifact, at this digest, from this consumer channel, is the supported presentation. (SOURCE_CAPTURES\\PROD-003\\report_representation_register.json, presentations[PR-01].admission_boundary)",
    secondary_presentation_role:
      "PR-02 (TransUnion Canada, SHA-256 244D58080254D9879468A43D56DA02BC952A20579E1BE9A51F83B7378439EFB4) corroborates the existence and the label of the Last Payment Date field across two Canadian consumer disclosures. It is NOT admitted as the format for any rule unit and is NOT a substitute for PR-01; no rule may be evaluated against it with PR-01's locator.",
  },
};


scope.evidence_references = [
  { id: "E-1", path: "SOURCE_CAPTURES\\PROD-003\\report_representation_register.json", what: "presentations[PR-01] (format, digest, section map, admission boundary) and field_records FACT-01 to FACT-06, including FACT-02's second_limb_note and FACT-05's EXTRACTION_UNRESOLVED status" },
  { id: "E-2", path: "SOURCE_CAPTURES\\PROD-003\\candidate_rule_units.json", what: "the selected unit's crosswalk record, its report_fact_mapping (FACT-02 and FACT-03 DEMONSTRATED_EXTRACTABLE) and its ledger dependencies" },
  { id: "E-3", path: "SOURCE_CAPTURES\\PROD-003\\crosswalk.json", what: "dependencies[D-2] (the single-specimen boundary) and the proposed ceiling that owner decision D-5 does not adopt" },
  { id: "E-4", path: "SOURCE_CAPTURES\\PHASE5-001I-A\\extraction_results.json", what: "the independent re-measurement of the printed Collections Last Payment Date row and the printed Request Date header, raw value beside normalized value" },
  { id: "E-5", path: "SOURCE_CAPTURES\\PHASE5-001I-A\\classification_record.json", what: "the recorded legacy classification D3 / REPORT_RELEVANT_BUT_NOT_DETECTABLE / observation / packet-ineligible" },
  { id: "E-6", path: "CRP_PHASE5_001I_B_INTERNAL_RULE_RECORD_DRAFT.md", what: "sections 4, 5 and 11 — the exact-specimen boundary, the field seating and the reconciliation of the demonstrated mapping; the draft itself is not gate evidence and is not an admitted rule record" },
  { id: "E-7", path: "SOURCE_CAPTURES\\PHASE5-001I-C\\owner_representation_decisions.json", what: "owner decisions D-1 to D-6, including the single-specimen acceptance, the control field name collection.lastPaymentDate, the reference-date reading, the scoped clearing, the retained observation ceiling and the single-specimen sufficiency" },
  { id: "E-8", path: "SOURCE_CAPTURES\\PHASE5-001K\\rescreen_register.csv", what: "the register row CRP-LSRC-0354 and the corpus-wide queue this scope does not touch" },
  { id: "E-9", path: "packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts", what: "the accepted source pin and the recorded D3 classification, read read-only by digest" },
];
scope.exclusions = [
  "every jurisdiction other than CA / CA-NS",
  "every rule unit other than CA-NS-CRA-S10-3-C-LIMB-1, and every other statutory limb of s. 10(3)(c)",
  "every report presentation other than PR-01 at the recorded digest; a different print date, product, bureau, scan, photograph, mobile view, subscriber or screening document, generated fixture and encrypted or text-less document all remain UNSUPPORTED",
  "consumer-upload availability and any report-family admission",
  "the remaining corpus-wide Gate 5.2 queue: the 409 NO_DURABLE_RESCREEN_RECORD rows, the other five report-mapping IDs (CRP-LSRC-0422, 0423, 0424, 0425, 0427) and CRP-LSRC-0194",
  "the effective-period and applicability-in-time question and its mandatory plain-English timing qualification",
  "the direct-report contract section 4 retention exception (recorded, not relied on) and the s. 10(3)(c)/s. 10(ha) citation seam",
  "the anniversary-boundary, month-end-clamp and day-count conventions (conventions the internal comparator implements, reserved to Gate 5.4)",
  "every finding class: neither VIOLATION nor PROBABLE_VIOLATION is authorized, and the ceiling is observation only",
];
scope.classification_and_ceiling = {
  determinability: "D3",
  recorded_conclusion: "REPORT_RELEVANT_BUT_NOT_DETECTABLE",
  permitted_conclusion: "observation",
  packet_eligibility: "ineligible",
  ceiling: "OBSERVATION_CLASS_ONLY",
  authorized_finding_classes: "none",
  source_of_the_ceiling: "owner decision D-5 (PHASE5-001I-C), retaining the recorded legacy classification; PROD-003's proposed PROBABLE_VIOLATION ceiling is not adopted",
};
scope.what_this_scope_is_not = [
  "not a corpus-wide progression: it clears no other row, admits no rule and changes no corpus-wide gate state",
  "not a report-family or product admission: it names one artifact at one digest",
  "not a finding authorization: it produces no consumer-visible output of any class and the application still reports report checking as not yet available",
  "not legal research: the accepted legal authority is unchanged and no source text was retrieved, paraphrased or re-interpreted",
  "not a repair: it authorizes nothing about the earlier custody discrepancies recorded by PHASE5-001I-B and PHASE5-001I-C",
];
scope.created_by = "PHASE5-001P";

fs.writeFileSync(path.join(OUT, "scope_definition.json"), JSON.stringify(scope, null, 2), "utf8");
console.log("scope written:", scope.scope_id, "| exclusions:", scope.exclusions.length);
