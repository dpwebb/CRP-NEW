/**
 * build_001s_next_order.js — PHASE5-001S step 7: issue the complete Gate 5.6 work order, and reconcile its
 * version-sharing tension explicitly.
 *
 * It refuses to write unless the successor Gate 5.5 verdict passes for this scope, every preceding scoped gate
 * passes for the same scope, and the rule record is still NOT_ADMITTED. It writes next_work_order.json. It
 * executes no part of Gate 5.6.
 */
const fs = require("fs");
const path = require("path");

const ROOT = "C:\\\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001S");
const sha256 = (p) =>
  require("crypto").createHash("sha256").update(fs.readFileSync(p)).digest("hex").toUpperCase();
const dig = (rel) => sha256(path.join(ROOT, rel));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const PLAN = "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md";
const planLines = fs.readFileSync(path.join(ROOT, PLAN), "utf8").split("\n");
const lineOf = (needle) => planLines.findIndex((l) => l.includes(needle)) + 1;
const lineText = (needle) => planLines[lineOf(needle) - 1];

const A = require("./amendments_001s.js");
const applied = readJson("SOURCE_CAPTURES\\PHASE5-001S\\amendment_application_result.json");
const successor = readJson("SOURCE_CAPTURES\\PHASE5-001S\\scoped_gate_5_5_verdict_successor.json");
const record = readJson("SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json");
const g52 = readJson("SOURCE_CAPTURES\\PHASE5-001P\\scoped_gate_5_2_verdict.json");
const g53 = readJson("SOURCE_CAPTURES\\PHASE5-001P\\scoped_gate_5_3_verdict.json");
const g54 = readJson("SOURCE_CAPTURES\\PHASE5-001Q\\scoped_gate_5_4_verdict.json");

const problems = [];
if (successor.verdict !== "PASSED_FOR_THIS_SCOPE") problems.push("the successor Gate 5.5 verdict does not pass for this scope");
if (g52.verdict !== "PASSED_FOR_THIS_SCOPE" || g53.verdict !== "PASSED_FOR_THIS_SCOPE" || g54.verdict !== "PASSED_FOR_THIS_SCOPE")
  problems.push("a preceding scoped gate does not pass for this scope");
if (record.admission_state.state !== "NOT_ADMITTED") problems.push("the rule record is no longer NOT_ADMITTED");
if (sha256(path.join(ROOT, PLAN)) !== applied.digest_after) problems.push("the recorded amendment is not in force");

const ruleRecordDigest = dig("SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json");
const preAdmissionVersionId = record.rule_identity.rule_id + "@PRE-ADMISSION-" + ruleRecordDigest.slice(0, 12);

const versionPins = [
  { what: "the governed rule record (the rule corpus for this scope)", path: "SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json", sha256: ruleRecordDigest, version_role: "pre-admission version identity " + preAdmissionVersionId + "; the production version string is RESERVED_TO_GATE_5_7 and is not assigned here" },
  { what: "the source crosswalk", path: "SOURCE_CAPTURES\\PROD-003\\crosswalk.json", sha256: dig("SOURCE_CAPTURES\\PROD-003\\crosswalk.json"), version_role: "immutable digest pin" },
  { what: "the report-representation register the crosswalk reads", path: "SOURCE_CAPTURES\\PROD-003\\report_representation_register.json", sha256: dig("SOURCE_CAPTURES\\PROD-003\\report_representation_register.json"), version_role: "immutable digest pin" },
  { what: "the report fact model", path: "SOURCE_CAPTURES\\PHASE5-001R\\report_fact_model.json", sha256: dig("SOURCE_CAPTURES\\PHASE5-001R\\report_fact_model.json"), version_role: "immutable digest pin" },
  { what: "the extraction-status vocabulary", path: "SOURCE_CAPTURES\\PHASE5-001R\\extraction_status_vocabulary.json", sha256: dig("SOURCE_CAPTURES\\PHASE5-001R\\extraction_status_vocabulary.json"), version_role: "immutable digest pin" },
  { what: "the deterministic evaluator specification (the tests are written against it)", path: "SOURCE_CAPTURES\\PHASE5-001R\\deterministic_evaluator_specification.json", sha256: dig("SOURCE_CAPTURES\\PHASE5-001R\\deterministic_evaluator_specification.json"), version_role: "immutable digest pin; a change to it is a new order, not a validation step" },
  { what: "the executable form compared against that specification", path: "SOURCE_CAPTURES\\PHASE5-001R\\evaluator_001r.cjs", sha256: dig("SOURCE_CAPTURES\\PHASE5-001R\\evaluator_001r.cjs"), version_role: "immutable digest pin; read, never re-implemented as a system" },
  { what: "the internal determinism check (the prior art the fixtures extend)", path: "SOURCE_CAPTURES\\PHASE5-001R\\internal_determinism_check.json", sha256: dig("SOURCE_CAPTURES\\PHASE5-001R\\internal_determinism_check.json"), version_role: "immutable digest pin" },
  { what: "the explanation templates", path: "SOURCE_CAPTURES\\PHASE5-001R\\output_vocabulary_and_explanation_surface.json", sha256: dig("SOURCE_CAPTURES\\PHASE5-001R\\output_vocabulary_and_explanation_surface.json"), version_role: "immutable digest pin" },
  { what: "the amended governing document the gate is read from", path: PLAN, sha256: sha256(path.join(ROOT, PLAN)), version_role: "post-PHASE5-001S digest; PHASE5-001S amendments A-1 to A-5" },
  { what: "the scoped Gate 5.5 verdict this order proceeds on", path: "SOURCE_CAPTURES\\PHASE5-001S\\scoped_gate_5_5_verdict_successor.json", sha256: dig("SOURCE_CAPTURES\\PHASE5-001S\\scoped_gate_5_5_verdict_successor.json"), version_role: "scope-level authority" },
];

const out = {
  artifact: "next_work_order.json",
  work_order: "PHASE5-001S",
  created_utc: "2026-09-30",
  type: "ISSUED WORK ORDER — not executed by the order that issues it",
  order_issued: true,
  issued_for: "Gate 5.6 — Validate before authorizing findings, for one scope only",
  order_id: "PHASE5-001T",
  order_id_note:
    "the Gate 5.6 order was reserved as PHASE5-001S by the unissued draft in SOURCE_CAPTURES\\PHASE5-001R\\next_work_order.json. The owner then used PHASE5-001S for this blocker-resolution order, so the Gate 5.6 order issues as PHASE5-001T and the draft it replaces is recorded as superseded, not hidden.",
  title: "Gate 5.6 validation fixtures, negative tests and independent replay for CA-NS-CRA-S10-3-C-LIMB-1 on PR-01",
  authority: {
    why_this_order_may_now_issue:
      "the amended build plan allows a later phase to begin for a named scope only when every preceding gate carries a passing verdict for that same scope. Gates 5.2, 5.3, 5.4 and now 5.5 each carry a passing scoped verdict for " +
      record.scope.scope_id +
      ", the last of them issued by PHASE5-001S under the amended authority.",
    predecessor_verdicts: [
      "Gate 5.2 — " + g52.verdict + " (SOURCE_CAPTURES\\PHASE5-001P\\scoped_gate_5_2_verdict.json)",
      "Gate 5.3 — " + g53.verdict + " (SOURCE_CAPTURES\\PHASE5-001P\\scoped_gate_5_3_verdict.json)",
      "Gate 5.4 — " + g54.verdict + " (SOURCE_CAPTURES\\PHASE5-001Q\\scoped_gate_5_4_verdict.json)",
      "Gate 5.5 — " + successor.verdict + " (SOURCE_CAPTURES\\PHASE5-001S\\scoped_gate_5_5_verdict_successor.json)",
    ],
    gate_5_1_note:
      "Gate 5.1 is recorded corpus-wide as met with the administrative limitations the plan states; it is not a per-scope gate and no scoped verdict is or was claimed for it.",
    the_governing_amendments: "PHASE5-001S amendments A-1 to A-5, " + applied.digest_before + " -> " + applied.digest_after,
    the_custody_exception: "SOURCE_CAPTURES\\PHASE5-001S\\custody_supplement.json — Owner Decision 1, which clears the progression obstacle without repairing or denying the historical preservation failure",
    governing_text: PLAN + " section 3 (Phase 5.6 and Gate 5.6 as amended, read with the PHASE5-001P scoped-progression paragraph and the PHASE5-001S pre-admission sequence)",
  },
  governing_text_quoted: [
    { document: PLAN, clause: "section 3, Phase 5.6 bullet 1 (the fixture suite)", line: lineOf("- Create synthetic and legally reviewed fixtures for each rule unit:"), text: lineText("- Create synthetic and legally reviewed fixtures for each rule unit:") },
    { document: PLAN, clause: "section 3, Phase 5.6 bullet 2 (the negative tests)", line: lineOf("- Add negative tests proving prohibited off-report facts"), text: lineText("- Add negative tests proving prohibited off-report facts") },
    { document: PLAN, clause: "section 3, Phase 5.6 bullet 3 (the independent replay)", line: lineOf("- Use an independent reviewer to reproduce a sample of each result"), text: lineText("- Use an independent reviewer to reproduce a sample of each result") },
    { document: PLAN, clause: "section 3, Phase 5.6 bullet 4 (consumer language)", line: lineOf("- Validate consumer language with realistic examples"), text: lineText("- Validate consumer language with realistic examples") },
    { document: PLAN, clause: "section 3, Gate 5.6 as amended by PHASE5-001S (A-4)", line: lineOf("**Gate 5.6:**"), text: A.replace[3].replacement_text },
    { document: PLAN, clause: "section 3, the PHASE5-001S pre-admission sequence paragraph", text: A.PRE_ADMISSION_PARAGRAPH.trim() },
    { document: PLAN, clause: "section 3, the PHASE5-001P progression bullet", line_of_note: lineOf("- **A later phase may begin for a named scope only when every preceding gate"), text: lineText("- **A later phase may begin for a named scope only when every preceding gate") },
  ],
  scope: successor.scope,
  version_pinning: {
    why:
      "Gate 5.6 as amended requires the rule corpus, the source crosswalk, the tests and the explanation templates to share one immutable version. This scope has no production rule version, because Gate 5.7 assigns it at admission. The condition is therefore measured against the pre-admission identity below plus the immutable digests of everything the scope reads and writes.",
    pre_admission_rule_record_version_identity: preAdmissionVersionId,
    production_admission_identity: "RESERVED_TO_GATE_5_7 — this order may not assign it, and its Gate 5.6 verdict must name the reservation rather than treat the condition as satisfied by it",
    pins: versionPins,
    what_this_order_must_do_about_the_tension: [
      "(a) pin the rule corpus, the crosswalk, the tests and the explanation templates by the pre-admission identity above together with every digest in the table, so the sharing condition is measured as far as this scope allows",
      "(b) name the version-sharing criterion as reserved and not satisfied in its Gate 5.6 verdict rather than passing it",
      "(c) if the owner instead reads Gate 5.6 as requiring an assigned production version, stop at its first action, name that criterion, and return for an owner instrument that assigns it",
    ],
    the_pinned_version_does_not_admit:
      "pinning the pre-admission identity is not admission, does not create an admitted rule, and does not let anything emit",
  },
};


out.deliverables = [
  "1. The fixture suite for this unit, synthetic and legally reviewed, covering every category the phase bullet names: clear breach, compliant/within-limit, exact boundary, wrong event date, date unavailable, report contradiction, exception shown, exception unknown, effective-period uncertainty, preemption uncertainty, duplicate catalogue source, wrong jurisdiction, parser failure, OCR ambiguity and report-section not inspected. Each fixture states the state it must reach, and every synthetic fixture is labelled synthetic so it can never be mistaken for a presentation. The exact-boundary fixture must reach the withheld outcome, not an exceeded or a not-exceeded one.",
  "2. The negative tests, each naming the prohibited behaviour it forbids: that no off-report fact is ever requested, inferred or used as a decisive fact; that a parser failure never becomes absence; that an unknown exception never suppresses a report-supported probable path; and that probable-only uncertainty never emits VIOLATION. This unit has no probable path and no finding class, so each test records what it demonstrates here — a refusal, or an observation-class record whose emission state is NOT_EMITTED — rather than implying a capability this scope does not have.",
  "3. An independent replay sample. An independent reviewer reproduces a sample of each result from the source pin and the report excerpt without seeing the evaluator output first. Every disagreement is reconciled before any approval is sought, and the reconciliation is recorded, including any that cannot be reconciled.",
  "4. Consumer-language validation, with realistic examples, showing that the explanation is useful and does not overstate a legal conclusion. Every template of output_vocabulary_and_explanation_surface.json at the pinned digest is exercised, including the withheld-boundary template, and no template may render a finding label.",
  "5. Its own verification, preservation and custody records in the form this workspace uses: a baseline taken before it writes anything, inputs re-measured against what earlier records hold, builders re-run and compared byte-for-byte, and a custody manifest.",
  "6. A Gate 5.6 verdict record that quotes the gate's text as amended, states each criterion for this scope with its evidence, and names every criterion it cannot meet instead of passing — including the version-sharing reservation this phase carries.",
];
out.explicit_exclusions = [
  "no rule admission and no coverage claim: 0 admitted governed rules and 0 permitted findings remain the recorded counts; the governed rule record stays NOT_ADMITTED and its production version string stays reserved to Gate 5.7 (build plan Phase 5.7 bullet 1)",
  "no finding class, no finding output and no change to the ceiling: this unit's ceiling is OBSERVATION_CLASS_ONLY, and neither VIOLATION nor PROBABLE_VIOLATION may be implemented, emitted, implied or promised for it",
  "no consumer-visible output of any class, no application change, no deployment and no consumer-data transmission; report checking remains \"not yet available\". A consumer-language validation validates templates in a record; it does not create a surface",
  "no change to the specification its predecessor produced: Gate 5.6 validates it, and a change to it is a new order, not a validation step",
  "NO RE-RUN OF ANY HARNESS THAT WRITES INTO A PRIOR EVIDENCE PACKAGE. The PHASE5-001I-A internal suite writes its results into its own package (tests/harness.cjs, finish()) and must not be run, re-run or invoked in any form. Its recorded result may be read at its digest only, and its passing tests are not evidence for this gate",
  "no conformance work on the PHASE5-001I-A internal comparator and no adoption of its boundary treatment, both of which stay recorded in SOURCE_CAPTURES\\PHASE5-001R\\implementation_comparison.json",
  "no new legal research, no source retrieval, no source paraphrase and no re-interpretation of the accepted legal authority: the accepted source is read at its recorded digest only",
  "no change to the effective-period state, the exception state or the anniversary-boundary question, and no calculation convention may be promoted to a requirement of the text",
  "no edit to the register, the ledger, the crosswalk, the catalogue, the corpus-wide queue, any historical manifest or any earlier baseline, and no promotion, closure or re-classification of any row",
  "no amendment to any governing document: this order carries no amendment authority, and the PHASE5-001S amendments are the last recorded change to the plan",
];
out.notes_carried_forward = [
  "the PHASE5-001I-A internal comparator is not gate evidence and its boundary treatment is NOT adopted: it returns an outcome on the exact sixth-anniversary day where the rule record withholds one, and 4 material differences stand recorded",
  "the six calculation conventions are conventions: none is a requirement of the text, and none may be presented as one",
  "the effective-period, exception and anniversary-boundary questions stay separate, explicit and unresolved; each restricts output rather than being filled with an invented fact",
  "the recorded legacy D3 / observation classification and packet ineligibility are preserved and may not be overridden",
  "the register row for this unit stays UNRESOLVED with its recorded blocker, and no row is promoted, cleared or re-classified",
  "the emission path on an ADMITTED rule record is unexercised and is named, not passed: it cannot be demonstrated before Gate 5.7 admission, and this order may not simulate it by admitting the rule",
  "the pre-admission rule-record version identity is content-derived and is not a production version; only Gate 5.7 assigns that",
  "the preservation failure of PHASE5-001R stands recorded, unauthorised and unrepaired; it is covered prospectively by Owner Decision 1 and by nothing else",
];


out.stop_conditions = [
  "any deliverable that would need a finding class, a finding label or a change to the observation-class ceiling: stop and return for an owner instrument, because a rank-6 order cannot create a finding class",
  "any deliverable that would need an admitted rule record, or that would be satisfied by admitting one: stop, name the criterion and return. The rule may not be admitted early to make a Gate 5.6 criterion pass",
  "a concrete source conflict, amendment, repeal or supersession indicator that would change legal content: hold for owner/legal direction rather than guessing",
  "a required decision or check that would need real consumer data, additional consumer evidence or a source retrieval the direct-report contract forbids",
  "a required check that cannot be met within this scope — including the version-sharing reservation, which needs a production version Gate 5.7 has not yet assigned — record the criterion as unmet or reserved for this scope instead of deciding it or filling it with an invented value",
];
out.acceptance_criteria = [
  "the fixture suite covers every category the phase bullet names for this scope, each fixture states the state it must reach, and every synthetic fixture is labelled synthetic",
  "the negative tests are run and recorded, each naming the prohibited behaviour it forbids, and none of them claims a capability this scope does not have",
  "the independent replay reproduces each sampled result from the source pin and the report excerpt, the reviewer's independence is recorded, and every disagreement is reconciled and recorded — or recorded as unresolved",
  "the consumer-language validation exercises every explanation template at its pinned digest, including the withheld-boundary template, and shows no overstatement and no finding label",
  "the Gate 5.6 verdict quotes the gate text as amended, states each criterion for this scope with its evidence, and names every criterion it cannot meet — including the version-sharing reservation — instead of passing it",
  "no finding class is implemented, emitted or implied for this unit, and no consumer-visible output of any class is produced",
  "no harness that writes into a prior evidence package is run, and the PHASE5-001I-A artifact is not rewritten: it is read at its digest or not at all",
  "the order's preservation and custody records show that no earlier artifact was changed outside its own package, and that no earlier baseline or manifest was overwritten",
];
out.what_this_order_may_not_do = [
  "it may not begin Gate 5.6 for any other jurisdiction, unit, limb or presentation",
  "it may not admit a rule, create coverage or a candidate, or authorize a finding class",
  "it may not treat this order's or its predecessor's scoped verdict as Gate 5.7 evidence, and it may not advance the corpus-wide queue",
  "it may not assign the production rule version, and it may not ask the owner to assign it in order to satisfy the version-sharing criterion",
];
out.what_this_order_requires_of_its_owner =
  "the order itself must carry its own authorisation and its own scope before it begins; nothing in this record authorises it to exceed the scope above";
out.what_this_issuing_order_did_not_do =
  "PHASE5-001S did not execute any part of Gate 5.6: no fixture, no negative test, no independent replay, no consumer-language validation and no Gate 5.6 verdict was specified, built or run, and no artifact of this order is evidence for Gate 5.6. The order is issued, not begun.";
out.created_by = "PHASE5-001S";

if (problems.length) {
  console.error("REFUSING TO WRITE: the order cannot issue.");
  problems.forEach((p) => console.error("  PROBLEM: " + p));
  process.exit(1);
}
fs.writeFileSync(path.join(OUT, "next_work_order.json"), JSON.stringify(out, null, 2), "utf8");
console.log("GATE 5.6 ORDER ISSUED: " + out.order_id + " for " + out.scope.scope_id);
console.log(
  "  deliverables: " + out.deliverables.length + " | exclusions: " + out.explicit_exclusions.length + " | stop conditions: " + out.stop_conditions.length + " | acceptance criteria: " + out.acceptance_criteria.length,
);
console.log("  pre-admission version identity: " + preAdmissionVersionId);

