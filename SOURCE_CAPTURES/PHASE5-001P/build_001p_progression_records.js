/**
 * build_001p_progression_records.js — writes reference_reconciliation.json and next_work_order.json.
 *
 * Step 9: reconcile every earlier statement about the corpus-wide progression model with the amended text,
 * WITHOUT rewriting any previous completion report, register, manifest or verdict record.
 * Step 10: since both scoped gates hold a passing verdict for this scope, issue the concrete Gate 5.4
 * rule-record finalization work order — issued here, executed by nobody in this order.
 */
const fs = require("fs");
const path = require("path");

const ROOT = "C:\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001P");
const PLAN = "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md";
const SCOPE = "SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT";
const read = (p) => fs.readFileSync(p, "utf8");
const lineOf = (doc, needle) => {
  const t = read(path.join(ROOT, doc));
  const i = t.indexOf(needle);
  return i < 0 ? null : t.slice(0, i).split("\n").length;
};

const rows = [
  {
    id: "R-1",
    where: "CRP_PHASE5_001I_C_OWNER_REPRESENTATION_DECISIONS.md, the answer table, Gate 5.4 row",
    quoted_text:
      "Gate 5.4 | NOT_STARTED, and it may not begin. PROD-003's recorded inference that \"Phase 5.4 may therefore begin for this one unit only\" is not adopted",
    status_under_the_scoped_model:
      "accurate as a statement about the text in force when it was written: no amendment then existed that could scope the gate. With amendments A-1 to A-3 in force and both preceding gates holding a passing verdict for this scope, a Gate 5.4 order may now be issued for this scope and for no other.",
    action_taken: "none — the record is not rewritten",
  },
  {
    id: "R-2",
    where: "CRP_PHASE5_001I_C_OWNER_REPRESENTATION_DECISIONS.md section 8, the prerequisite-chain table (Gate 5.2 and Gate 5.4 rows)",
    quoted_text:
      "5.2 | ADVANCEABLE_FROM_THE_ACCEPTED_CORPUS, ... | no. \"Advanceable\" is a work-direction reading. No durable record declares this gate passed, and its own second criterion is unmet for 409 rows",
    status_under_the_scoped_model:
      "unchanged and still true corpus-wide: the corpus-wide Gate 5.2 condition remains unpassed with 409 rows unfinished. What the amendment adds is a scoped verdict recorded separately, which does not alter this statement.",
    action_taken: "none — the record is not rewritten",
  },
  {
    id: "R-3",
    where: "SOURCE_CAPTURES\\PHASE5-001I-C\\owner_representation_decisions.json, next_minimal_action.why_it_is_this_and_not_something_else",
    quoted_text:
      "the build plan orders the work so that a later phase cannot begin before its stated gate passes ... Gate 5.3 cannot be recorded as a phase completion while its predecessor is incomplete, and no Gate 5.4 order may be issued before that",
    status_under_the_scoped_model:
      "the ordering sentence it quotes is unchanged. Its conclusion was drawn before any scoping amendment existed; with the scoped-progression paragraph in force the ordering rule is read per scope, and both preceding gates now hold a passing verdict for this scope.",
    action_taken: "none — the record is not rewritten",
  },
  {
    id: "R-4",
    where: "SOURCE_CAPTURES\\PHASE5-001I-C\\verification_results.json, prerequisite_sequence and gate_5_2_criteria",
    quoted_text:
      "gate_5_2: INCOMPLETE. Recorded state ADVANCEABLE_FROM_THE_ACCEPTED_CORPUS; the gate text itself unchanged by the PHASE5-001O amendments; no durable pass exists; criterion 2 unmet for 409 rows",
    status_under_the_scoped_model:
      "every clause of it remains true: the corpus-wide state is unchanged, no durable corpus-wide pass exists, and criterion 2 is still unmet for the 409 rows. The scoped verdict is recorded in this package and does not revise this measurement.",
    action_taken: "none — the record is not rewritten",
  },
  {
    id: "R-5",
    where: "CRP_PHASE5_001I_B_INTERNAL_RULE_RECORD_DRAFT.md section 9, and SOURCE_CAPTURES\\PHASE5-001I-B\\rule_record_draft.json gate_5_4_reading",
    quoted_text:
      "Nothing else can be completed before it: Gate 5.4 may not begin until Gate 5.3 passes ... this crossreference is preparation, not a Gate 5.4 submission",
    status_under_the_scoped_model:
      "still true, and now applicable to a gate that holds a passing scoped verdict for this scope: Gate 5.4 may begin for this scope only, and the draft remains preparation rather than a submission.",
    action_taken: "none — the record is not rewritten",
  },
  {
    id: "R-6",
    where: "SOURCE_CAPTURES\\PROD-003\\gate_prerequisites.json, prerequisite G-5.3",
    quoted_text:
      "for exactly one candidate on exactly one presentation the representation and its location are now verified and measured; every other candidate keeps a source-grounded unresolved status. Phase 5.4 may therefore begin for this one unit only.",
    status_under_the_scoped_model:
      "not adopted by PHASE5-001I-C and not adopted here either — but the outcome it predicted is now reached by measurement plus owner amendment rather than by inference. The authority is amendment A-1 and the two scoped verdicts in this package, not this record's inference.",
    action_taken: "none — the record and its file are preserved; the digest recorded in PHASE5-001I-C is unchanged",
  },
];


rows.push(
  {
    id: "R-7",
    where: "CRP_PHASE5_NEXT_GATE_RECONCILIATION.md section 4.2, and section 7 rows P-6 and P-7",
    quoted_text:
      'Gate 5.2 asks for "all 437 entries … a reconciled report-only disposition or a documented reason they are not assessable". A disposition cannot be reconciled against an inventory that does not exist.',
    status_under_the_scoped_model:
      "rank 6, read subject to the amended rank-5 text. Its measurement stands and the corpus-wide condition it describes is unchanged; the amended text now permits a scoped verdict to be read against the records inside its named scope, which is what this package records.",
    action_taken: "none — the record is not rewritten",
  },
  {
    id: "R-8",
    where: "SOURCE_CAPTURES\\PHASE5-001O\\gate_reassessment_001o.json, gate_status[\"5.2\"]",
    quoted_text: "requirement_now: \"Unchanged.\"; state: ADVANCEABLE_FROM_THE_ACCEPTED_CORPUS",
    status_under_the_scoped_model:
      "unchanged for the corpus-wide gate; it was correctly recorded as a work direction and not a pass. The scoped verdict does not convert it into one.",
    action_taken: "none — the record is not rewritten",
  },
  {
    id: "R-9",
    where:
      PLAN +
      " section 6, the PHASE5-001B continuation instruction (line 166 before amendment A-1; line " +
      lineOf(PLAN, "Then continue remaining batches autonomously until Gate 5.2 passes") +
      " now)",
    quoted_text:
      "Then continue remaining batches autonomously until Gate 5.2 passes, pausing only for a material owner/legal decision.",
    status_under_the_scoped_model:
      "preserved verbatim and still governing: the batch program continues toward the corpus-wide gate and the queue is untouched. The scoped verdict neither pauses nor waives it.",
    action_taken: "none — clause C-6 was deliberately not amended",
  },
  {
    id: "R-10",
    where: "SOURCE_CAPTURES\\PHASE5-001I-A\\gate_sequence_assessment.json, P-1",
    quoted_text:
      "Work proceeds in the following order. A later phase cannot begin before its stated gate passes. Record completed and blocked items in durable artifacts; do not rely on conversation-only decisions as certification records.",
    status_under_the_scoped_model:
      "the quoted sentence is unchanged and is still the first clause of section 3. Amendment A-1 adds the scoped-progression paragraph after it; the internal-validation carve-out (PHASE5-001I-A) follows in the same section and is untouched.",
    action_taken: "none — the record is not rewritten",
  }
);

const out = {
  artifact: "reference_reconciliation.json",
  work_order: "PHASE5-001P",
  created_utc: "2026-09-30",
  purpose:
    "reconcile every earlier statement about the corpus-wide progression model with the amended governing text, without rewriting any earlier completion report, register, manifest or verdict record",
  method:
    "each earlier statement is located, quoted, and given its status under the amended text. No earlier file is edited: the reconciliation is recorded here and nowhere else.",
  statements_reconciled: rows.length,
  nothing_rewritten:
    "No completion report, register, provenance record, ledger, crosswalk, manifest or verdict record of any earlier order was edited by this order. The only pre-existing file this order changed is the amended build plan, whose amendment history now carries the PHASE5-001P row.",
  rows,
  residual_tension_recorded_not_resolved: [
    "PHASE5-001I-C declined to adopt PROD-003's inference; this order also does not adopt it as such. The scope is opened by the owner's amendment and by two scoped verdicts recorded criterion by criterion, and a reader comparing the two records should read PROD-003's sentence as a prediction that was not authority when it was written.",
    "the phrase 'Phase 5.4 may begin for this one unit only' and this order's rule 'a later phase may begin for a named scope only when every preceding gate carries a passing verdict for that same scope' agree in outcome and differ in authority; the amended text governs.",
  ],
  created_by: "PHASE5-001P",
};
fs.writeFileSync(path.join(OUT, "reference_reconciliation.json"), JSON.stringify(out, null, 2), "utf8");
console.log("reconciliation rows:", rows.length);


// ---- step 10: the Gate 5.4 rule-record finalization work order --------------------------------
const workOrder = {
  artifact: "next_work_order.json",
  work_order: "PHASE5-001P",
  created_utc: "2026-09-30",
  type: "ISSUED WORK ORDER — not executed by the order that issues it",
  issued_for: "Gate 5.4 — Select and certify rule units, for one scope only",
  order_id: "PHASE5-001Q",
  title: "Gate 5.4 rule-record finalization for CA-NS-CRA-S10-3-C-LIMB-1 on PR-01",
  authority: {
    why_this_order_may_now_issue:
      "the amended build plan allows a later phase to begin for a named scope only when every preceding gate carries a passing verdict for that same scope. Gate 5.2 and Gate 5.3 each carry a passing scoped verdict for SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT, recorded criterion by criterion in this package.",
    governing_text:
      "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md section 3 (Gate 5.4, and the PHASE5-001P scoped-progression paragraph)",
    scope: SCOPE,
    still_required_of_the_issuing_owner:
      "the order itself must carry its own authorisation and its own scope; nothing in this record authorises it to exceed the scope above",
    what_it_may_not_do: [
      "it may not begin Gate 5.4 for any other jurisdiction, unit, limb or presentation",
      "it may not admit a rule, create coverage or a candidate, or authorize a finding class",
      "it may not treat this order's scoped verdicts as Gate 5.5 or Gate 5.6 evidence",
    ],
  },
  deliverables: [
    "1. The complete field-by-field governed rule record for CA-NS-CRA-S10-3-C-LIMB-1, built from CRP_PHASE5_001I_B_INTERNAL_RULE_RECORD_DRAFT.md, carrying: immutable RULE_ID; RULE_VERSION as a placeholder reserved to Gate 5.7; exact jurisdiction (CA / CA-NS) and the jurisdiction-enumeration version; source ID and pin (CRP-LSRC-0354; rules.canada.ts at its recorded digest); formal-edition status as an administrative limitation; effective dates and status; the exact legal proposition for s. 10(3)(c)'s last-payment limb; applicability; report-required facts; decisive facts; exceptions; the deterministic breach test; the report representation and locators (FACT-02 and FACT-03); the consumer citation; and the consumer-facing qualifications.",
    "2. The six outstanding rule-record decisions, each recorded explicitly: (a) the admitted rule record's required field name per owner decision D-2 (collection.lastPaymentDate) and whether the legacy required-field name is amended; (b) the effective-period handling (effectiveFrom and effectiveTo null, status in_force, basis recorded_gap_commencement_not_read) and the exact wording of the mandatory plain-English timing qualification; (c) the anniversary-boundary convention, the month-end clamp for a 29 February start, and the derived day-count convention, all as conventions and none presented as a requirement of the text; (d) the exception determination, including whether the direct-report contract section 4 retention route is ever relied on, and the divergence between that route and the recorded legacy D3 conclusion; (e) the ceiling field carrying D-5's observation-class decision and the retained D3 classification; (f) the immutable rule version string and the admission form, both reserved to Gate 5.7.",
    "3. Independent validation of faithful transcription and field-by-field mapping to the accepted legal record — the check Gate 5.4 itself requires; it does not repeat the owner's legal/source certification.",
    "4. A Gate 5.4 verdict record that quotes the gate's text, states every criterion for this scope, gives the evidence for each state, and names any criterion it cannot meet instead of issuing the verdict.",
    "5. The order's own verification, preservation and custody records, in the form this workspace uses.",
  ],
  explicit_exclusions: [
    "no new legal research, no source retrieval, no source paraphrase and no re-interpretation of the accepted legal authority",
    "no rule admission and no coverage claim; 0 admitted rules and 0 permitted findings remain the recorded counts",
    "no evaluator build or rebuild (Gate 5.5), no fixture or independent-replay suite (Gate 5.6), no admission (Gate 5.7)",
    "no consumer-visible output of any class, no application change, no deployment, no consumer-data transmission",
    "no work on the second limb beyond recording it as unseated; no disposition, promotion or re-classification of any register row",
    "no edit to the corpus-wide queue, the register, the ledger, the crosswalk, the catalogue or any historical manifest beyond the already-recorded supplement, which only a separate owner order may apply",
  ],
};

workOrder.notes_carried_forward = [
  "the PHASE5-001I-A internal comparator may be read as preparation, but it must be re-created and re-validated under Gates 5.5 and 5.6 before any admission, and it is not gate evidence",
  "the effective-period, exception and calculation-convention uncertainties stay separate from legal-corpus acceptance: none of them reopens the accepted statute",
  "the recorded legacy D3 / observation classification and packet ineligibility are preserved and may not be overridden",
];
workOrder.stop_conditions = [
  "a concrete source conflict, amendment, repeal or supersession indicator that changes legal content: hold for owner/legal direction rather than guessing",
  "a required governed field that cannot be evidenced without inventing an element or reading in an off-report requirement",
  "any request for additional consumer evidence, which the direct-report contract forbids",
];
workOrder.acceptance_criteria = [
  "every required governed field is recorded for this scope, with no unresolved affirmative element other than those the contracts expressly permit",
  "the transcription and mapping are independently checked against the accepted legal record and the representation register",
  "the verdict record quotes the gate text and states each criterion for this scope, with the evidence for each",
  "the order's preservation and custody records show that no earlier artifact was changed outside its own package",
];
workOrder.what_this_issuing_order_did_not_do =
  "it did not execute any part of Gate 5.4: no rule record was finalised, no rule was selected, no field was recorded outside this scope, and no admission was prepared. The order is issued, not begun.";

fs.writeFileSync(path.join(OUT, "next_work_order.json"), JSON.stringify(workOrder, null, 2), "utf8");
console.log("next work order issued:", workOrder.order_id, "|", workOrder.title);

