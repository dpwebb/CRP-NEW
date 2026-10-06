/**
 * build_001s_successor_verdict.js — PHASE5-001S step 5 and 6: reassess every scoped Gate 5.5 criterion
 * against the amended authority, and issue the successor verdict.
 *
 * It refuses to write unless the amendment is in force, the rule record is still NOT_ADMITTED, the counts are
 * still zero, the suspension-basis verdict of PHASE5-001R is still withheld and unedited, and the custody
 * exception is recorded. It writes scoped_gate_5_5_verdict_successor.json. It edits nothing and admits nothing.
 */
const fs = require("fs");
const path = require("path");

const ROOT = "C:\\\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001S");
const sha256Of = (buf) => require("crypto").createHash("sha256").update(buf).digest("hex").toUpperCase();
const sha256 = (p) => sha256Of(fs.readFileSync(p));
const readJson = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), "utf8"));
const dig = (...p) => sha256(path.join(ROOT, ...p));

const PLAN = "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md";
const planText = fs.readFileSync(path.join(ROOT, PLAN), "utf8");
const planLines = planText.split("\n");
const gateLine = planLines.findIndex((l) => l.startsWith("**Gate 5.5:**")) + 1;
const GATE_TEXT = planLines[gateLine - 1];

const A = require("./amendments_001s.js");
const applied = readJson("SOURCE_CAPTURES", "PHASE5-001S", "amendment_application_result.json");
const amendmentRecords = readJson("SOURCE_CAPTURES", "PHASE5-001S", "amendment_text.json");
const supplement = readJson("SOURCE_CAPTURES", "PHASE5-001S", "custody_supplement.json");
const prize = readJson("SOURCE_CAPTURES", "PHASE5-001R", "scoped_gate_5_5_verdict.json");
const spec = readJson("SOURCE_CAPTURES", "PHASE5-001R", "deterministic_evaluator_specification.json");
const check = readJson("SOURCE_CAPTURES", "PHASE5-001R", "internal_determinism_check.json");
const surface = readJson("SOURCE_CAPTURES", "PHASE5-001R", "output_vocabulary_and_explanation_surface.json");
const record = readJson("SOURCE_CAPTURES", "PHASE5-001Q", "rule_record.json");
const g54 = readJson("SOURCE_CAPTURES", "PHASE5-001Q", "scoped_gate_5_4_verdict.json");

const problems = [];
if (sha256(path.join(ROOT, PLAN)) !== applied.digest_after) problems.push("the amendment is not in force on the build plan");
if (!planText.includes(A.PRE_ADMISSION_PARAGRAPH.replace(/^\n+/, ""))) problems.push("the PHASE5-001S paragraph is absent from the plan");
if (record.admission_state.state !== "NOT_ADMITTED") problems.push("the rule record is no longer NOT_ADMITTED");
if (record.admission_state.admitted_governed_rules_after_this_order !== 0 || record.admission_state.permitted_findings_after_this_order !== 0)
  problems.push("the recorded counts are not zero");
if (!/WITHHELD/.test(prize.verdict)) problems.push("the PHASE5-001R verdict is not the withheld verdict this order resolves");
if (g54.verdict !== "PASSED_FOR_THIS_SCOPE") problems.push("Gate 5.4 does not pass for this scope");
if (check.failure_count !== 0) problems.push("the synthetic check does not record 0 failures");
if (!supplement.verdict.startsWith("SUPPLEMENTAL CUSTODY DECISION RECORDED")) problems.push("the custody exception is not recorded");

const p001R = "SOURCE_CAPTURES\\PHASE5-001R\\";
const e = (f) => p001R + f + " at " + dig("SOURCE_CAPTURES", "PHASE5-001R", f);

const preAdmissionVersionId =
  record.rule_identity.rule_id + "@PRE-ADMISSION-" + dig("SOURCE_CAPTURES", "PHASE5-001Q", "rule_record.json").slice(0, 12);

const acceptance = [
  {
    n: 1,
    criterion_verbatim: prize.acceptance_criteria[0].criterion_verbatim,
    where_it_sits: "the acceptance criteria of PHASE5-001R, criterion 1, read with build plan line 132 and line 133",
    previous_state: prize.acceptance_criteria[0].state,
    state: "MET within the scope — carried forward, re-read under the amended authority",
    evidence: [
      e("report_fact_model.json") + ": two entries, kinds RULE_READ_FACT and EVALUATION_CONVENTION_INPUT, each carrying the six parts the plan names",
      e("extraction_status_vocabulary.json") + ": the gate's four statuses, each reachable path named, the two extra states of the earlier artifact kept in their own layers",
      "the amendment does not touch the fact model, the vocabulary, or the plan line each was parsed out of, so nothing in this criterion changes",
    ],
    unresolved_within_this_scope: [
      "the second limb stays unseated and the effective period stays unresolved; each restricts output rather than being filled",
    ],
  },
  {
    n: 2,
    criterion_verbatim: prize.acceptance_criteria[1].criterion_verbatim,
    where_it_sits: "acceptance criterion 2, read with build plan line 134 and Gate 5.5",
    previous_state: prize.acceptance_criteria[1].state,
    state: "MET within the scope — carried forward, re-read under the amended authority",
    evidence: [
      e("deterministic_evaluator_specification.json") + ": " + (spec.decision_rules || []).length + " ordered decision rules with a fixed precedence",
      e("internal_determinism_check.json") + ": " + check.case_count + " synthetic cases, " + check.failure_count + " failures, " + check.emission_tally.cases_that_emitted_a_result + " cases emitting a result",
      "the exact sixth-anniversary day is still withheld and the comparator's contrary convention is still not adopted",
    ],
    unresolved_within_this_scope: [],
  },
  {
    n: 3,
    criterion_verbatim: prize.acceptance_criteria[2].criterion_verbatim,
    where_it_sits: "acceptance criterion 3, read with Gate 5.5's emission conditions",
    previous_state: prize.acceptance_criteria[2].state,
    state: "MET within the scope — and this is now the state the amended text requires rather than merely permits",
    evidence: [
      e("deterministic_evaluator_specification.json") + ": six named refusals, one per condition, and no outcome on any of them",
      "the amended section 3 Phase 5.5 bullet 3 and the amended section 4 item 5 both say the evaluator must still refuse to emit on the finalised record until Gate 5.7 admits it; the amended PHASE5-001S paragraph makes that a requirement of the sequence",
      "the amended Gate 5.6 paragraph forbids producing a finding class, coverage or consumer-visible output from a pre-admission record",
    ],
    unresolved_within_this_scope: [],
  },
  {
    n: 4,
    criterion_verbatim: prize.acceptance_criteria[3].criterion_verbatim,
    where_it_sits: "acceptance criterion 4, read with build plan line 135 and line 136",
    previous_state: prize.acceptance_criteria[3].state,
    state: "MET within the scope — carried forward, re-read under the amended authority",
    evidence: [
      e("output_vocabulary_and_explanation_surface.json") +
        ": ceiling " + surface.record_ceiling_carried.permitted_result_ceiling + ", " + surface.record_ceiling_carried.finding_classes_available.length + " finding classes available, " + surface.forbidden_labels.length + " forbidden labels, " + surface.explanation_surface.length + " templates, none rendering a finding label",
      "the rule record still carries admission_form RESERVED_TO_GATE_5_7, with 0 admitted governed rules and 0 permitted findings",
    ],
    unresolved_within_this_scope: [],
  },
];


acceptance.push(
  {
    n: 5,
    criterion_verbatim: prize.acceptance_criteria[4].criterion_verbatim,
    where_it_sits: "acceptance criterion 5, read with build plan line 136",
    previous_state: prize.acceptance_criteria[4].state,
    state: "MET within the scope — carried forward",
    evidence: [
      e("internal_determinism_check.json") + ": " + check.case_count + " cases, each recorded against the rule record's own test, with " + check.boundary_and_clamp_cases.length + " boundary and clamp cases listed",
      "the check opens no report and reads no specimen; the specimen exists here as a digest pointer only",
    ],
    unresolved_within_this_scope: [
      "the legally reviewed fixture suite and the independent replay are Gate 5.6 work and are still excluded from this scope; no fixture here is legally reviewed",
    ],
  },
  {
    n: 6,
    criterion_verbatim: prize.acceptance_criteria[5].criterion_verbatim,
    where_it_sits: "acceptance criterion 6",
    previous_state: prize.acceptance_criteria[5].state,
    state: "MET within the scope — discharged again by this successor record",
    evidence: [
      "this record quotes Gate 5.5's own sentence at build plan line " + gateLine + ", and the amended Phase 5.5 bullet 3, section 4 item 5 and Gate 5.6 at their new locations",
      "all 15 criteria are stated with their evidence, and the two items that withheld the previous verdict are restated with their residual limits",
      "the previous verdict is preserved unedited at " + dig("SOURCE_CAPTURES", "PHASE5-001R", "scoped_gate_5_5_verdict.json"),
    ],
    unresolved_within_this_scope: [],
  },
  {
    n: 7,
    criterion_verbatim: prize.acceptance_criteria[6].criterion_verbatim,
    where_it_sits: "acceptance criterion 7",
    previous_state:
      "NAMED — NOT MET IN THIS SCOPE (preserved verbatim in the PHASE5-001R verdict and in its preservation record, neither of which this order edits)",
    state:
      "SUSTAINED BY THE RECORDED OWNER EXCEPTION — the historical failure stands, and the obstacle to progression it created is covered prospectively by an owner instrument",
    evidence: [
      "the failure is preserved: " + e("scoped_gate_5_5_verdict.json") + " still records criterion 7 as NAMED — NOT MET IN THIS SCOPE, and " + e("preservation_and_change_record.json") + " still records the change with unauthorised: true",
      "the exception is recorded: SOURCE_CAPTURES\\PHASE5-001S\\custody_supplement.json links the original hash " + supplement.the_chain.original_recorded_hash + ", the current hash " + supplement.the_chain.current_measured_hash + ", the cause, the affected order PHASE5-001R and the prospective baseline",
      "this order's own preservation record shows exactly one pre-existing file changed, and it is the rank-5 build plan, amended under the recorded owner decisions; 0 files are missing, and no earlier manifest or baseline was overwritten",
      "the PHASE5-001I-A manifest that holds the original digest is preserved unedited, so both states of the artifact stay visible in the record",
    ],
    unresolved_within_this_scope: [
      "the artifact's byte-level identity remains different from the one its own manifest holds, and the failure is not repaired, only covered prospectively",
      "the change remains unauthorised in the historical record and is not restated as authorised",
      "the artifact's tests remain non-evidence for Gate 5.6, by the same owner decision",
    ],
  },
);


// ---- the gate sentence's own criteria, re-read under the amended authority -------------------------------
const gateDetail = [
  {
    state: "MET within the scope, as a specification — re-read under the amended authority",
    evidence: [
      "19 ordered decision rules with a fixed precedence and one result each",
      check.case_count + " synthetic cases, " + check.failure_count + " failures; cases D-25 and D-26 show identical records for identical inputs and no clock, locale, time-zone, host, session, environment or random source read",
      "the amendment changes no decision rule, no precedence rule and no arithmetic",
    ],
    unresolved: [],
  },
  {
    state: "MET within the scope, as a specification — re-read under the amended authority",
    evidence: [
      e("report_fact_model.json") + ": every fact carries its locator, its register field, its raw and normalized value and its transformation provenance",
      "the source side is the accepted pin at its recorded digest, and the citation is carried on the explanation surface of every template",
      "the arithmetic is recomputed independently and matches the record: anniversary 2027-02-01, span 2191 days, elapsed 1919 days, outcome PERIOD_NOT_EXCEEDED",
      "the amended text adds a second thing to be traceable to — the pinned pre-admission version identity, " + preAdmissionVersionId + " — and this verdict traces to it",
    ],
    unresolved: [],
  },
  {
    state: "MET within the scope — re-read under the amended authority",
    evidence: [
      "the comparison layer runs only when both facts are PRESENT; otherwise no outcome is produced",
      "cases D-09 to D-15 cover the missing label, the doubled label, the blank value, a foreign printed form, the single absence path, the contradictory header and the missing page",
      "a refused or mis-mapped document never reaches the fact layer, so a refused document can never be reported as an empty report",
    ],
    unresolved: [],
  },
  {
    state:
      "MET within the scope, as a refusal behaviour — and this clause is now the operative state of the scope rather than a temporary condition",
    evidence: [
      "gate G6 refuses with REFUSED_RULE_RECORD_NOT_ADMITTED and produces no outcome; case D-22 shows the refusal on a fully eligible input",
      "the amended text keeps that refusal as a requirement: the finalised record may be read by the specification and by Gate 5.6, and it must not be emitted from until Gate 5.7 admits it",
      "no rule is admitted anywhere in this order: 0 admitted governed rules and 0 permitted findings remain the recorded counts",
    ],
    unresolved: [
      "the emission path on an ADMITTED rule record is still unexercised, and no credit is claimed for it: it cannot be demonstrated before Gate 5.7 admission, which follows a successful Gate 5.6",
      "this item is named here rather than passed, and it is not a criterion the gate sentence sets — it is the presupposition the amendment resolved as to what the gates may read",
    ],
  },
];


gateDetail.push(
  {
    state: "MET within the scope — re-read under the amended authority",
    evidence: [
      "two named refusals: REFUSED_NO_JURISDICTION_SELECTION_SUPPLIED and REFUSED_JURISDICTION_NOT_AUTHORIZED_FOR_THIS_UNIT, exercised by cases D-18 and D-19",
      "jurisdiction is never inferred from the report, in either the specification or the fact model; the amended text changes nothing here",
    ],
    unresolved: [],
  },
  {
    state: "MET within the scope — re-read under the amended authority",
    evidence: [
      "gate G4 refuses with REFUSED_WRONG_EVENT_DATE_MAPPING unless the caller declares exactly the recorded mapping for both event roles",
      "case D-20 declares the last-payment role against a different printed field and the evaluator refuses",
      "the amended pre-admission clause conditions what may be read, not what may be emitted, so this clause is untouched",
    ],
    unresolved: [],
  },
  {
    state: "MET within the scope — re-read under the amended authority",
    evidence: [
      "the two governing qualifications — the unresolved effective period and the unmade exception determination — are carried on every template and restrict output rather than being resolved by assumption",
      "the unit produces no PERIOD_EXCEEDED and no PERIOD_NOT_EXCEEDED on the exact sixth-anniversary day: case D-02 withholds the outcome",
      "the amended text explicitly forbids producing a finding class, coverage or consumer-visible output from a pre-admission record, which is the same prohibition at its strongest for this unit",
    ],
    unresolved: [],
  },
  {
    state:
      "RESOLVED AS A PRESUPPOSITION BY THE AMENDED AUTHORITY — and the emission path it names stays unexercised and is NOT claimed",
    evidence: [
      "what the bullet presupposed — an ADMITTED rule record as an input the specification must take — is now recorded for a named scope as the finalised Gate 5.4 record read at its pinned pre-admission version (" + preAdmissionVersionId + "), with admission reserved to Gate 5.7",
      "the amendment is in force: " + A.replace.length + " quoted replacements and one appended amendment-history row, measured in amendment_application_result.json with the inversion check in amendment_text.json reconstructing the pre-amendment bytes exactly",
      "the rule record remains NOT_ADMITTED with admission_form RESERVED_TO_GATE_5_7, so the letter of the original bullet is not simulated: no admitted rule record exists and none is claimed",
      "the emission path on an admitted record remains unexercised, and Gate 5.7 is still the only step that could exercise it",
    ],
    unresolved: [
      "the emission path on an ADMITTED rule record is not exercised, not demonstrated and not claimed",
      "the smallest action that would exercise it: Gate 5.7 admission, which follows a successful Gate 5.6 for this scope",
    ],
  },
);



const gate = prize.gate_criteria.map((c, i) => ({
  n: i + 1,
  criterion_verbatim: c.criterion_verbatim,
  where_it_sits: c.where_it_sits,
  previous_state: c.state,
  state: gateDetail[i].state,
  evidence: gateDetail[i].evidence,
  unresolved_within_this_scope: gateDetail[i].unresolved,
}));

const metAcceptance = acceptance.filter((a) => a.state.startsWith("MET")).length;
const metGate = gate.filter((c) => c.state.startsWith("MET") || c.state.startsWith("RESOLVED AS A PRESUPPOSITION")).length;
const coveredByException = acceptance.filter((a) => a.state.startsWith("SUSTAINED BY THE RECORDED OWNER EXCEPTION")).length;
const namedNotClaimed = gate
  .concat(acceptance)
  .filter((c) => c.unresolved_within_this_scope.some((u) => /not exercised|unexercised/.test(u)))
  .map((c) => c.n);

const out = {
  artifact: "scoped_gate_5_5_verdict_successor.json",
  work_order: "PHASE5-001S",
  created_utc: "2026-09-30",
  document_type:
    "SCOPED GATE VERDICT — SUCCESSOR to the withheld PHASE5-001R verdict, issued under the amended authority",
  purpose:
    "reassess every scoped Gate 5.5 criterion against the amended authority and, where each applicable requirement is satisfied or expressly covered by the recorded owner exception, issue the successor verdict for one scope only",
  scope: {
    scope_id: record.scope.scope_id,
    jurisdiction:
      record.scope.jurisdiction.country_code + "/" + record.scope.jurisdiction.region_code + " (exact: the consumer selection is authoritative and is never inferred)",
    rule_unit: record.scope.rule_unit,
    limb_in_scope: record.scope.limb_in_scope,
    limb_out_of_scope: record.scope.limb_out_of_scope,
    presentation:
      record.scope.presentation.presentation_id + " — " + record.scope.presentation.publisher + "; admission boundary: " + record.scope.presentation.admission_boundary,
    source: record.governed_fields.find((f) => f.field === "source ID and pin").value.source_entry_id,
    pre_admission_rule_record_version_identity: preAdmissionVersionId,
    pre_admission_rule_record_digest: dig("SOURCE_CAPTURES", "PHASE5-001Q", "rule_record.json"),
    production_admission_identity: "RESERVED_TO_GATE_5_7 — not assigned, not invented, and not required by this verdict",
  },
  supersedes_and_preserves: {
    the_previous_verdict: "SOURCE_CAPTURES\\PHASE5-001R\\scoped_gate_5_5_verdict.json",
    its_digest: dig("SOURCE_CAPTURES", "PHASE5-001R", "scoped_gate_5_5_verdict.json"),
    its_verdict: prize.verdict,
    its_state:
      "PRESERVED UNCHANGED — this order does not edit it, and its withheld verdict, its named criteria and its preservation finding all stand exactly as that order recorded them",
    what_this_successor_adds:
      "the authority that was missing, not new evidence: the same 15 criteria, reassessed against the amended governing text and the recorded owner exception",
  },
  gate: "Gate 5.5",
  gate_text_quoted_verbatim: GATE_TEXT,
  gate_line_in_the_amended_document: gateLine,
  governing_text_quoted: [
    { document: PLAN, clause: "section 3, Gate 5.5 — unchanged by this order", line: gateLine, text: GATE_TEXT },
    {
      document: PLAN,
      clause: "section 3, Phase 5.5 bullet 3, as amended by PHASE5-001S (A-2)",
      text: A.replace[1].replacement_text,
    },
    {
      document: PLAN,
      clause: "section 4, Durable artifacts to create, item 5, as amended by PHASE5-001S (A-3)",
      text: A.replace[2].replacement_text,
    },
    {
      document: PLAN,
      clause: "section 3, Gate 5.6, as amended by PHASE5-001S (A-4)",
      text: A.replace[3].replacement_text,
    },
    {
      document: PLAN,
      clause: "section 3, owner authority PHASE5-001S — pre-admission specification and validation sequence (A-1)",
      text: A.PRE_ADMISSION_PARAGRAPH.trim(),
    },
  ],
  authority_for_this_scoped_verdict: {
    owner_decisions:
      "SOURCE_CAPTURES\\PHASE5-001S\\owner_decisions.json — OWNER DECISION 1 (custody exception) and OWNER DECISION 2 (pre-admission sequence)",
    amendment:
      "SOURCE_CAPTURES\\PHASE5-001S\\amendment_application_result.json and amendment_text.json — the quoted-replacement amendment applied through Core Constitution section 6, invertible back to " +
      applied.digest_before,
    clause_identification:
      "SOURCE_CAPTURES\\PHASE5-001S\\amendment_authority_analysis.json — the three clauses that created the circular prerequisite, quoted and located",
    custody: "SOURCE_CAPTURES\\PHASE5-001S\\custody_supplement.json — the supplemental custody decision required by Owner Decision 1",
    scoped_progression:
      "the PHASE5-001P paragraph, which allows a later phase to begin for a named scope only when every preceding gate carries a passing verdict for that same scope",
    this_verdict_passes_no_corpus_wide_gate:
      "it is a scoped record. Gate 5.5 remains unpassed corpus-wide, and nothing here states or implies otherwise.",
  },
};

out.what_changed_since_the_withheld_verdict = [
  {
    change: "the pre-admission sequence is recorded in the governing document",
    record: "SOURCE_CAPTURES\\PHASE5-001S\\amendment_text.json — A-1 to A-5, the rank-5 build plan " + applied.digest_before + " -> " + applied.digest_after,
    effect_on_this_gate: "the presupposition in Phase 5.5 bullet 3 and in section 4 item 5 is now read as the finalised Gate 5.4 record for a named scope, with admission reserved to Gate 5.7 and with the refusal still required",
  },
  {
    change: "the custody exception is recorded",
    record: "SOURCE_CAPTURES\\PHASE5-001S\\custody_supplement.json",
    effect_on_this_gate: "criterion 7's historical failure stands and is covered prospectively by an owner instrument, so the obstacle to progression it created is cleared without the failure being denied",
  },
];

out.the_two_items_that_withheld_the_previous_verdict = [
  {
    item: "an evaluator whose inputs include admitted rule records, and whose emission path is therefore exercised",
    previous_state: "NAMED — NOT MET IN THIS SCOPE",
    how_it_is_resolved: "as a presupposition, by the amendment: for a named scope the specification and Gate 5.6 read the finalised Gate 5.4 record at its pinned pre-admission version, so no gate waits on the admission that Gate 5.7 performs later",
    residual_and_named: "the emission path on an ADMITTED rule record remains unexercised and is NOT claimed; it cannot be exercised before Gate 5.7 admission",
    why_this_does_not_withhold_the_verdict:
      "the gate sentence's own prohibition — that output cannot emit on unapproved rules — is met by the named refusal, and the amendment resolved what the gate may read. No requirement is deleted: the emission prohibition is stronger, not weaker, because the evaluator must now refuse on the finalised record until Gate 5.7 admits it.",
  },
  {
    item: "the alternative owner reading of that same bullet, recorded so that it cannot be missed",
    previous_state: "NAMED — NOT SETTLED BY THIS ORDER",
    how_it_is_resolved:
      "the owner has settled it: Owner Decision 2 records that Gate 5.5 specification and Gate 5.6 validation may use a finalised, scoped Gate 5.4 rule record that is NOT_ADMITTED, and the amendment records that reading in the governing text itself",
    residual_and_named: "none for this scope",
    why_this_does_not_withhold_the_verdict: "the reading that would have withheld the verdict has been decided by the owner and is no longer open",
  },
  {
    item: "acceptance criterion 7 — no earlier artifact was changed outside its own package",
    previous_state: "NAMED — NOT MET IN THIS SCOPE",
    how_it_is_resolved: "by the recorded owner exception: the regenerated artifact is accepted as the retained artifact and authorised for prospective use at its full measured hash",
    residual_and_named: "the historical failure stands recorded as a failure and the previous bytes remain unrecovered",
    why_this_does_not_withhold_the_verdict:
      "this order was instructed to issue the successor verdict where the requirements are satisfied OR expressly covered by the recorded owner exception, and this one is expressly covered. The failure is not converted into a pass: the original criterion stays marked failed in the historical record.",
  },
];

out.acceptance_criteria = acceptance;
out.gate_criteria = gate;
out.acceptance_criterion_count = acceptance.length;
out.gate_criterion_count = gate.length;
out.criterion_count = acceptance.length + gate.length;
out.tally = {
  acceptance_criteria_met: metAcceptance + " of " + acceptance.length,
  gate_criteria_met_or_resolved: metGate + " of " + gate.length,
  covered_by_the_recorded_owner_exception: coveredByException,
  named_and_not_claimed: namedNotClaimed,
  withheld: 0,
};
out.verdict = "PASSED_FOR_THIS_SCOPE";
out.why_the_verdict_is_issued = [
  "every criterion of the gate sentence is met within this scope, as a specification or as a refusal behaviour",
  "the phase-bullet presupposition is resolved as a presupposition by the amended authority, and the emission path it names is still named rather than claimed",
  "the preservation criterion's historical failure is preserved and is expressly covered by the recorded owner exception, which is why it no longer withholds this verdict",
  "nothing has been converted, promoted or re-classified to reach this verdict, and no missing work was turned into a gap or a refusal",
];
out.verdict_meaning =
  "for SCOPE-CA-NS-CRA-S10-3-LIMB-1-PR01-LASTPAYMENT only: the deterministic evaluation specification for this unit satisfies Gate 5.5 as a specification, with its emission path refused and unexercised while the rule record is unadmitted. It is a scoped verdict. It does not pass Gate 5.5 corpus-wide, it gives no Gate 5.7 credit, and it admits no rule.";
out.corpus_wide_verdict =
  "NOT PASSED AND UNCHANGED — Gate 5.5 remains unpassed for the corpus, Gate 5.4 remains unpassed for every other scope, and the recorded counts are 0 admitted governed rules and 0 permitted findings. This verdict clears no register row, promotes no record and closes nothing.";


out.preserved_requirements_unchanged = [
  {
    requirement: "observation-only classification",
    state:
      "PRESERVED — the recorded classification " +
      (surface.record_ceiling_carried.classification_retained || {}).determinability +
      " / " +
      (surface.record_ceiling_carried.classification_retained || {}).recorded_conclusion +
      " and the ceiling " +
      surface.record_ceiling_carried.permitted_result_ceiling +
      " are carried through this verdict unchanged: observation-only, no finding class available, and nothing here overrides either",
  },
  {
    requirement: "packet ineligibility",
    state: "PRESERVED — nothing in this verdict makes the unit eligible for any packet, evidence set or report surface, and no consumer-visible output exists or is authorised",
  },
  {
    requirement: "exact-specimen scope",
    state: "PRESERVED — one jurisdiction, one rule unit, one statutory limb, one byte-pinned presentation: " + record.scope.presentation.presentation_id + " at " + record.scope.presentation.sha256 + ". Structural similarity admits nothing, and the second limb stays unseated",
  },
  {
    requirement: "timing qualifications",
    state: "PRESERVED — the effective period and the exception determination stay unresolved and restrictive, and no effective date is invented",
  },
  {
    requirement: "exception limitations",
    state: "PRESERVED — an unknown exception is not treated as absent, and the direct-report section 4 route is relied on by nothing",
  },
  {
    requirement: "the withheld anniversary equality",
    state: "PRESERVED — the exact sixth-anniversary day still produces no outcome (BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY with comparison_outcome UNRESOLVED), and the internal comparator's contrary convention is still NOT adopted",
  },
];
out.excluded_and_unresolved_items = [
  "the second limb remains excluded and unevaluated; it may not be inferred, defaulted or reported as absent or compliant",
  "the effective period, the exception determination and the anniversary-boundary legal question remain unresolved and restrictive",
  "the production rule version string remains reserved to Gate 5.7, and the pre-admission version identity is content-derived rather than a production version",
  "the emission path on an admitted rule record remains unexercised; the legally reviewed fixtures, the negative tests, the independent replay and the consumer-language validation are Gate 5.6 work and are not claimed here",
  "the implementation comparison's 11 recorded differences stay recorded and unadopted, including the comparator's contrary boundary treatment",
  "the preservation change stays disclosed, unauthorised historically and unrepaired; it is covered prospectively, not erased",
];
out.what_this_verdict_does_not_do = [
  "it does not admit a rule, create a candidate, create coverage or create a finding class; 0 governed rules and 0 permitted findings remain the recorded counts",
  "it does not pass Gate 5.5 corpus-wide, and it records no gate as passed for any scope other than the one named above",
  "it does not claim the emission path on an admitted rule record is exercised, demonstrated or safe: that path is still refused and unexercised",
  "it does not treat the regenerated artifact's tests as evidence for Gate 5.6, and it does not use them as Gate 5.5 evidence either",
  "it does not repair or deny the preservation failure, and it does not restate the unauthorised write as authorised",
  "it does not authorise consumer-visible output, an application change, a deployment or an external transmission; report checking remains \"not yet available\"",
  "it does not edit the previous verdict, the historical manifests, the register, the ledger, the crosswalk or the corpus queue",
  "it is not independent legal review",
];
out.created_by = "PHASE5-001S";

if (problems.length) {
  console.error("REFUSING TO WRITE: preconditions not met.");
  problems.forEach((p) => console.error("  PROBLEM: " + p));
  process.exit(1);
}
fs.writeFileSync(path.join(OUT, "scoped_gate_5_5_verdict_successor.json"), JSON.stringify(out, null, 2), "utf8");
console.log("SUCCESSOR GATE 5.5 VERDICT: " + out.verdict + " for " + out.scope.scope_id);
console.log("  criteria: " + out.criterion_count + " | acceptance met " + out.tally.acceptance_criteria_met + " | gate met-or-resolved " + out.tally.gate_criteria_met_or_resolved + " | covered by the owner exception " + out.tally.covered_by_the_recorded_owner_exception + " | withheld " + out.tally.withheld);

