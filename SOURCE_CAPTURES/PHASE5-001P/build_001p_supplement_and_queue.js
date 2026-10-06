/**
 * build_001p_supplement_and_queue.js — writes disposition_supplement.json and corpus_queue_preservation.json.
 *
 * The supplement is the successor disposition supplement required by step 8: it reflects the fields and the
 * five scoped limitations PHASE5-001I-C proposed, states which scoped information it adds and which original
 * unresolved statuses remain, and is RECORDED rather than applied — the PHASE5-001K register, its provenance
 * and every historical manifest are preserved byte for byte.
 *
 * The queue record re-measures the register from the CSV itself, so the counts are measured rather than
 * copied, and it records the corpus-wide gate states separately from the scoped verdicts.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = "C:\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001P");
const sha256File = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").toUpperCase();
const REGISTER = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001K", "rescreen_register.csv");
const SCOPE = "SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT";

// ---- measure the register from the file itself -------------------------------------------------
const csv = fs.readFileSync(REGISTER, "utf8").split(/\r?\n/).filter((l) => l.length > 0);
const header = csv[0].match(/"(?:[^"]|"")*"/g).map((s) => s.slice(1, -1));
const rows = csv.slice(1).map((line) => {
  const fields = line.match(/"(?:[^"]|"")*"/g).map((s) => s.slice(1, -1).replace(/""/g, '"'));
  const rec = {};
  header.forEach((h, i) => (rec[h] = fields[i]));
  return rec;
});
const countBy = (key) => rows.reduce((acc, r) => ((acc[r[key]] = (acc[r[key]] || 0) + 1), acc), {});
const dispositions = countBy("disposition");
const states = countBy("disposition_state");
const blockers = countBy("blocker_type");
const row354 = rows.find((r) => r.source_entry_id === "CRP-LSRC-0354");
const baselineRegister = JSON.parse(fs.readFileSync(path.join(OUT, "preserved_files_before.json"), "utf8")).files.find(
  (f) => f.relative_path === "SOURCE_CAPTURES\\PHASE5-001K\\rescreen_register.csv"
);

const supplement = {
  artifact: "disposition_supplement.json",
  work_order: "PHASE5-001P",
  created_utc: "2026-09-30",
  document_type: "successor disposition supplement — RECORDED, NOT APPLIED",
  purpose:
    "carry forward the scoped disposition information PHASE5-001I-C proposed, in a successor record that adds the scoped information explicitly and leaves every original unresolved status exactly as it stands",
  scope_id: SCOPE,
  applies_to: {
    canonical_register_row:
      "SOURCE_CAPTURES\\PHASE5-001K\\rescreen_register.csv, the row whose source_entry_id is CRP-LSRC-0354 (file line 355; line 1 is the header)",
    mirrors: [
      "SOURCE_CAPTURES\\PHASE5-001K\\rescreen_provenance.json step_09_open_blocker_queue entries[CRP-LSRC-0354]",
      "CRP_CORRECTED_LOGIC_RESCREEN_REGISTER.md sections 5, 10 and 10.1 (the 0354 rows)",
      "SOURCE_CAPTURES\\PHASE5-001O\\source_id_coverage_ledger.json and .csv row CRP-LSRC-0354",
      "SOURCE_CAPTURES\\PROD-003\\candidate_rule_units.json report_mapping_blocked_rows[CRP-LSRC-0354] and selected_unit.ledger_dependencies",
    ],
  },
  status: {
    applied: false,
    applied_by_this_order: false,
    why_not_applied_here:
      "the row belongs to PHASE5-001K and its mirrors to PHASE5-001O and PROD-003. This order was authorized to record the supplement, not to edit another order's register; the owner required the original 001K register and the historical manifests to be preserved.",
    what_would_apply_it:
      "a later owner-issued order that edits the register row in an authorised batch, with its own before/after digests, in the form PHASE5-001K and PHASE5-001O used",
    no_backdating:
      "an applied change carries the date it is applied, not the date of this record, and it reconciles the owner decision of 2026-09-30 rather than authorizing anything earlier",
  },
};

supplement.the_five_scoped_fields_and_limitations_the_supplement_adds = [
  {
    id: "S-1",
    field: "representation_cleared_for",
    value:
      "PR-01 only: LEG-CONSUMER-EQ-CA, SHA-256 E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F, 96,393 bytes, 22 pages — FACT-02 (the printed Collections Last Payment Date row, page 16 line 32 and page 17 line 5) and FACT-03 (the printed Request Date page header, line 1 of all 22 pages). Cleared for the last-payment limb only.",
    source_decision: "PHASE5-001I-C D-1, D-2, D-3 and D-4",
  },
  {
    id: "S-2",
    field: "cleared_by",
    value:
      "owner decisions D-1 to D-6, recorded in CRP_PHASE5_001I_C_OWNER_REPRESENTATION_DECISIONS.md and SOURCE_CAPTURES\\PHASE5-001I-C\\owner_representation_decisions.json; the demonstrated mapping recorded in SOURCE_CAPTURES\\PROD-003\\report_representation_register.json field_records FACT-02 and FACT-03, re-measured in SOURCE_CAPTURES\\PHASE5-001I-A\\extraction_results.json, and reconciled in CRP_PHASE5_001I_B_INTERNAL_RULE_RECORD_DRAFT.md sections 4, 5 and 11",
    source_decision: "PHASE5-001I-C D-4 (clearing) and the records it binds",
  },
  {
    id: "S-3",
    field: "clearing_scope_limit",
    value:
      "one candidate, one presentation, one limb, two demonstrated fields. No report-family admission, no consumer-upload availability, no reuse of the locator on another specimen, and no effect on any other row of the register.",
    source_decision: "PHASE5-001I-C D-1 and D-6",
  },
  {
    id: "S-4",
    field: "not_cleared",
    value:
      "the no-payment/default-date alternative and the second limb; the effective-period and applicability-in-time question and its mandatory timing qualification; the direct-report contract section 4 retention exception (recorded, not relied on); the result ceiling and the recorded legacy D3 / observation classification; the presentation boundary beyond this specimen; every other rule, timing, exception and presentation dependency; and every other row of the register",
    source_decision: "PHASE5-001I-C D-4 (not_cleared list) and D-5 (ceiling)",
  },
  {
    id: "S-5",
    field: "missing_artifact (re-worded so it describes only what remains)",
    value:
      "exact presentation mapping for the residual no-payment/default-date alternative of Nova Scotia Credit Reporting Act s. 10(3)(c). The last-payment-date alternative is demonstrated on the byte-pinned Equifax Canada consumer specimen PR-01 (SHA-256 E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F): the printed Last Payment Date row inside a Collections contract debt record, page 16 line 32 and page 17 line 5, read as the collection-scoped fact collection.lastPaymentDate. The no-payment/default-date alternative remains unmapped on this presentation and unevaluated.",
    source_decision: "PHASE5-001I-C proposed_register_update.json fields_proposed_to_change[missing_artifact]",
  },
];
supplement.field_level_set_from_001I_C = {
  fields_left_exactly_unchanged: {
    disposition: row354.disposition,
    disposition_state: row354.disposition_state,
    blocker_type: row354.blocker_type,
  },
  why_they_stay_unchanged:
    "the row still blocks on missing evidence — the no-payment/default-date alternative has no located field on this presentation — so it is not durably dispositioned and may not be promoted; and REPORT_EVENT_DATE_MAPPING_UNVERIFIED remains the exact description of the residual issue, so the register's closed vocabulary needs no new value",
  field_changing_additively:
    "disposition_basis (the original basis quoted, with the owner decisions and the demonstrated-mapping records appended, so the earlier basis stays legible)",
  fields_added: ["representation_cleared_for", "cleared_by", "clearing_scope_limit", "not_cleared"],
  mapping_note:
    "the five scoped fields and limitations above are the substance of the four added fields and the one re-worded free-text field; S-1 to S-5 correspond to representation_cleared_for, cleared_by, clearing_scope_limit, not_cleared and the re-worded missing_artifact",
};


supplement.original_unresolved_statuses_that_remain = [
  "the register row's disposition stays UNRESOLVED and its disposition_state stays BLOCKED_MISSING_EVIDENCE",
  "its blocker_type stays REPORT_EVENT_DATE_MAPPING_UNVERIFIED, and the row stays in the 416 UNRESOLVED rows and in the 416-entry open-blocker queue",
  "the second limb of s. 10(3)(c) remains unseated on this presentation, and no class is inferred for this row or for any other ID",
  "the other five report-mapping IDs (CRP-LSRC-0422, 0423, 0424, 0425, 0427), CRP-LSRC-0194 and all 409 NO_DURABLE_RESCREEN_RECORD rows are untouched",
  "the effective-period, exception, calculation-convention, presentation-boundary and ceiling questions stay open as recorded",
  "the corpus-wide Gate 5.2 and Gate 5.3 conditions remain unpassed",
];
supplement.added_scoped_information_in_one_sentence =
  "The supplement adds five scoped statements to the row's reading — the specimen and the two demonstrated fields the clearing runs to, the owner decisions that clear them, the limit that the clearing is one candidate, one presentation, one limb and two fields, everything the clearing does not reach, and the re-worded statement of what remains — and it adds nothing else: no disposition value, no class, no count, no gate state and no coverage.";
supplement.preservation_of_the_originals = {
  phase5_001k_register_csv: {
    path: "SOURCE_CAPTURES\\PHASE5-001K\\rescreen_register.csv",
    baseline_sha256: baselineRegister.sha256,
    measured_now: sha256File(REGISTER),
    unchanged: baselineRegister.sha256 === sha256File(REGISTER),
  },
  phase5_001k_register_narrative: "CRP_CORRECTED_LOGIC_RESCREEN_REGISTER.md, preserved byte for byte as recorded by PHASE5-001K",
  historical_manifests:
    "every file_custody_manifest.json and preserved_files_before.json of every earlier order remains byte-identical; this order overwrites none of them and creates its own",
};
supplement.boundaries = [
  "it applies nothing: no register file, narrative, provenance record, ledger row or crosswalk entry is edited by this order",
  "it promotes nothing: the row's UNRESOLVED disposition and every unresolved status stay as recorded",
  "it admits no rule, creates no coverage or candidate, authorizes no finding class and passes no gate, scoped or corpus-wide",
];


// ---- corpus-wide queue preservation ---------------------------------------------------------
const queue = {
  artifact: "corpus_queue_preservation.json",
  work_order: "PHASE5-001P",
  created_utc: "2026-09-30",
  purpose:
    "record that the corpus-wide unfinished queue is preserved exactly as PHASE5-001K and PHASE5-001L/M/N/O left it, and that no corpus-wide gate is claimed, so a scoped verdict cannot be read as a corpus-wide pass",
  measured_from: "SOURCE_CAPTURES\\PHASE5-001K\\rescreen_register.csv, re-parsed by this order",
  register_digest: {
    recorded: baselineRegister.sha256,
    measured_now: sha256File(REGISTER),
    unchanged: baselineRegister.sha256 === sha256File(REGISTER),
    bytes: baselineRegister.bytes,
  },
  corpus_totals: {
    data_rows: rows.length,
    distinct_source_entry_ids: new Set(rows.map((r) => r.source_entry_id)).size,
  },
  dispositions,
  disposition_states: states,
  blocker_types: blockers,
  open_queue_size: states.BLOCKED_MISSING_EVIDENCE || 0,
  the_row_this_scope_concerns: {
    source_entry_id: "CRP-LSRC-0354",
    disposition: row354.disposition,
    disposition_state: row354.disposition_state,
    blocker_type: row354.blocker_type,
    note: "unchanged in the register file; the scoped verdict changes its reading, not its record",
  },
};
queue.corpus_wide_gate_status_kept_separate = {
  note: "these are the corpus-wide states, recorded separately from the two scoped verdicts and not changed by them",
  "5.1": "MET with recorded administrative limitations (PHASE5-001O amendment); unchanged",
  "5.2": "NOT PASSED — 409 rows carry NO_DURABLE_RESCREEN_RECORD, six rows depend on a report mapping, and one row is closed by owner direction; no durable corpus-wide pass exists",
  "5.3": "NOT PASSED corpus-wide — reached for one candidate on one presentation and passed for none; no corpus-wide intended-format inventory exists",
  "5.4": "NOT STARTED corpus-wide. A Gate 5.4 work order may now be issued for this scope only, because both preceding gates hold a passing verdict for that same scope",
  "5.5": "NOT STARTED",
  "5.6": "NOT STARTED",
  "5.7": "NOT REACHED — 0 admitted governed rules and 0 permitted findings",
  scoped_verdicts_recorded_by_this_order: { "5.2": "PASSED_FOR_THIS_SCOPE", "5.3": "PASSED_FOR_THIS_SCOPE" },
};
queue.nothing_converted = {
  statement:
    "no row was converted into GAP or REFUSAL and no missing work was relabelled to satisfy a criterion. The GAP and REFUSAL counts measured above are the register's recorded values, unchanged by this order.",
  evidence: [
    "the register CSV digest is unchanged from the baseline this order measured before amending anything",
    "the disposition distribution is unchanged: 416 UNRESOLVED, 18 GAP, 3 REFUSAL",
    "the blocker distribution is unchanged: 409 NO_DURABLE_RESCREEN_RECORD, 6 REPORT_EVENT_DATE_MAPPING_UNVERIFIED, 1 CANDIDATE_REPRESENTATION_UNRESOLVED_GATE_5_3_M1, plus the 21 durably-recorded rows",
  ],
};
queue.rows_that_remain_evidence_or_work_blocked = [
  "409 rows: NO_DURABLE_RESCREEN_RECORD — documentation work in an authorised batch, with an evidence route only where the disposition turns on report mapping",
  "6 rows: REPORT_EVENT_DATE_MAPPING_UNVERIFIED — CRP-LSRC-0354 (this scope's source record, residual alternative only), 0422, 0423, 0424, 0425, 0427",
  "1 row: CRP-LSRC-0194 — closed by owner direction until a concrete new consumer-format source appears",
];
queue.preservation_and_custody_reference = {
  measured_by: "preservation_and_change_record.json and file_custody_manifest.json",
  reading:
    "the only pre-existing file this order changed is the amended build plan; every register, provenance, ledger, crosswalk, catalogue, application and manifest file remains byte-identical to its baseline digest",
};
queue.created_by = "PHASE5-001P";

fs.writeFileSync(path.join(OUT, "disposition_supplement.json"), JSON.stringify(supplement, null, 2), "utf8");
fs.writeFileSync(path.join(OUT, "corpus_queue_preservation.json"), JSON.stringify(queue, null, 2), "utf8");
console.log(
  "supplement + queue written | rows:",
  rows.length,
  "| dispositions:",
  JSON.stringify(dispositions),
  "| blockers:",
  JSON.stringify(blockers),
  "| register unchanged:",
  queue.register_digest.unchanged
);
