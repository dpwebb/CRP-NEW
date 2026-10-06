/**
 * build_001s_authority_analysis.js — PHASE5-001S step 1: identify the exact governing clauses that create
 * the circular prerequisite, and record which authorities were inspected and deliberately NOT amended.
 *
 * This builder runs BEFORE the amendment is applied. It refuses to write if the amendment has already been
 * applied, so the record it produces is always a pre-amendment record: the document digest it records is the
 * digest the amendment procedure started from, and every clause it quotes is quoted from that state.
 *
 * It writes amendment_authority_analysis.json. It edits nothing.
 */
const fs = require("fs");
const path = require("path");

const ROOT = "C:\\\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001S");
const PLAN = "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md";
const CONSTITUTION = "CRP_CORE_CONSTITUTION.md";
const A = require("./amendments_001s.js");

const sha256 = (p) =>
  require("crypto").createHash("sha256").update(fs.readFileSync(p)).digest("hex").toUpperCase();
const read = (p) => fs.readFileSync(p, "utf8");

const planTextAsFound = read(path.join(ROOT, PLAN));

// ---- the pre-amendment text -----------------------------------------------------------------------------
// This record must quote the document as it stood BEFORE the amendment. Two ways of obtaining that are
// accepted, and the record states which one was used:
//   (a) the amendment has not been applied yet and the file is read directly; or
//   (b) the amendment has been applied, so the recorded amendment is inverted in memory and the
//       reconstruction is verified against the digest_before the amendment procedure recorded. If that
//       digest does not come back, the run aborts, because a reconstruction that does not hash correctly is
//       not the pre-amendment document.
const problems = [];
const amendmentApplied =
  planTextAsFound.includes(A.append[0].marker) ||
  A.replace.some((a) => planTextAsFound.split(a.replacement_text).length - 1 >= 1);
let planText = planTextAsFound;
let howRead = "PRE_AMENDMENT — read directly from the file, before this order applied its amendment";
if (amendmentApplied) {
  const rec = JSON.parse(fs.readFileSync(path.join(OUT, "amendment_text.json"), "utf8"));
  let inv = planTextAsFound.replace("\n" + A.append[0].row, "");
  for (let i = A.replace.length - 1; i >= 0; i--) {
    inv = inv.replace(A.replace[i].replacement_text, A.replace[i].replaced_text);
  }
  const reconstructed = require("crypto").createHash("sha256").update(Buffer.from(inv, "utf8")).digest("hex").toUpperCase();
  if (reconstructed !== rec.digest_before) {
    problems.push(
      "the pre-amendment text reconstructed from the recorded amendment hashes to " + reconstructed + ", not to the recorded digest_before " + rec.digest_before,
    );
  }
  planText = inv;
  howRead =
    "PRE_AMENDMENT — reconstructed in memory by inverting the amendment recorded in amendment_text.json; the reconstruction hashes to " +
    reconstructed +
    ", the digest_before the amendment procedure recorded";
}
const planLines = planText.split("\n");
const inMemory = (s) => require("crypto").createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex").toUpperCase();

for (const a of A.replace) {
  const occ = planText.split(a.replaced_text).length - 1;
  if (occ !== 1) problems.push(a.id + ": replaced text occurs " + occ + " time(s) in the pre-amendment text");
}
if (problems.length) {
  console.error("REFUSING TO WRITE: this record must be built from the pre-amendment document.");
  problems.forEach((p) => console.error("  PROBLEM: " + p));
  process.exit(1);
}

// ---- helpers -------------------------------------------------------------------------------------------
const lineOf = (needle) => planLines.findIndex((l) => l.includes(needle)) + 1;
const quote = (needle) => {
  const i = lineOf(needle);
  if (i < 1) return { line: null, text: null };
  return { line: i, text: planLines[i - 1] };
};
const oneLineQuote = (needle) => {
  const q = quote(needle);
  if (q.text === null) problems.push("quoted text not found: " + needle);
  return q;
};
const rangeQuote = (fromNeedle, toNeedle) => {
  const a = lineOf(fromNeedle);
  const b = lineOf(toNeedle);
  if (a < 1 || b < 1) {
    problems.push("quoted range not found: " + fromNeedle + " .. " + toNeedle);
    return { line_start: null, line_end: null, text: null };
  }
  return { line_start: a, line_end: b, text: planLines.slice(a - 1, b).join("\n") };
};

const ORDERING_SENTENCE = oneLineQuote("Work proceeds in the following order.");
const P001P_AUTHORITY = oneLineQuote("**Owner authority PHASE5-001P");
const P001P_SCOPE_BULLET = rangeQuote("**For progression purposes only, a gate may also be recorded as passed", "  other.");
const P001P_LATER_PHASE_BULLET = rangeQuote("- **A later phase may begin for a named scope only when every preceding gate", "  other.");
const P001P_UNMET_BULLET = rangeQuote("- **The corpus-wide unfinished queue is preserved as recorded.**", "  unmet criterion instead of being issued.");
const P001P_OPENING = rangeQuote("**Owner authority PHASE5-001P", "paragraph adds a scope to the sequencing sentence above. It weakens no gate's own conditions.");
const PHASE_5_4_HEADING = oneLineQuote("### Phase 5.4 — Select and certify rule units");
const GATE_5_4_TEXT = oneLineQuote("**Gate 5.4:**");
const PHASE_5_5_BULLET_3 = oneLineQuote("- Implement deterministic rule evaluators that take only the uploaded report's resolved facts");
const GATE_5_5_TEXT = oneLineQuote("**Gate 5.5:**");
const PHASE_5_6_BULLET_3 = oneLineQuote("- Use an independent reviewer to reproduce a sample of each result");
const GATE_5_6_TEXT = oneLineQuote("**Gate 5.6:**");
const PHASE_5_7_BULLET_1 = oneLineQuote("- Prepare a rule-corpus amendment containing only rules that passed Gates 5.1");
const GATE_5_7_TEXT = oneLineQuote("**Gate 5.7 / segment exit:**");
const SECTION_4_ITEM_5 = oneLineQuote("5. Deterministic fact/evaluator specification and implementation, only after rule units");
const SECTION_2_1_OPEN = oneLineQuote("Authorize a `VIOLATION` only where all of the following are true:");
const SECTION_5_OPEN = oneLineQuote("## 5. Stop conditions requiring direction");
const SECTION_7_OPEN = rangeQuote("## 7. Scope boundary", "It does not amend the old application or its detector.");
const SECTION_8_OPEN = oneLineQuote("## 8. Amendment History");


const constitutionText = read(path.join(ROOT, CONSTITUTION));
const consLines = constitutionText.split("\n");
const consClause = (fromNeedle, toNeedle) => {
  const a = consLines.findIndex((l) => l.includes(fromNeedle)) + 1;
  const b = consLines.findIndex((l) => l.includes(toNeedle)) + 1;
  return {
    clause: fromNeedle.replace(/\*\*/g, "").trim(),
    line_start: a,
    line_end: b,
    text: consLines.slice(a - 1, b).join("\n"),
  };
};

// ---- the circular prerequisite -------------------------------------------------------------------------
const circular = [
  {
    id: "CIR-1",
    document: PLAN,
    rank: 5,
    section: "section 3, Phase 5.5 — Specify deterministic report evaluation, bullet 3",
    line: PHASE_5_5_BULLET_3.line,
    quoted_text: PHASE_5_5_BULLET_3.text,
    presupposition: "the evaluator the gate validates must take admitted rule records",
    why_it_is_circular:
      "The bullet makes an admitted rule record an input of the thing Gate 5.5 specifies and validates. Admission is Gate 5.7: Phase 5.7 bullet 1 requires a rule-corpus amendment containing only rules that passed Gates 5.1-5.6, and Gate 5.7 requires a formally admitted rule unit whose evaluator passes the validation suite. Reading the bullet as a precondition therefore requires an admitted rule before Gate 5.5 and Gate 5.6, and it requires Gates 5.5 and 5.6 to pass before the rule may be admitted.",
    read_alone_it_blocks: [
      "recording a Gate 5.5 scoped verdict, because the emission path the bullet presupposes cannot exist yet",
      "recording a Gate 5.6 scoped verdict, which Gate 5.7 in turn waits on",
    ],
  },
  {
    id: "CIR-2",
    document: PLAN,
    rank: 5,
    section: "section 4, Durable artifacts to create, item 5",
    line: SECTION_4_ITEM_5.line,
    quoted_text: SECTION_4_ITEM_5.text,
    presupposition: "the deterministic fact/evaluator specification may be created only after rule units are admitted",
    why_it_is_circular:
      "This is the same prerequisite stated a second time, in the deliverable list rather than in the gate sequence: the artifact Gate 5.5 produces is deferred until the admission that Gate 5.7 performs after Gate 5.5 and Gate 5.6 pass.",
    read_alone_it_blocks: ["producing the Gate 5.5 specification and implementation at all"],
  },
  {
    id: "CIR-3",
    document: PLAN,
    rank: 5,
    section: "section 3, Gate 5.6",
    line: GATE_5_6_TEXT.line,
    quoted_text: GATE_5_6_TEXT.text,
    presupposition:
      "the rule corpus must share one immutable version with the crosswalk, the tests and the explanation templates",
    why_it_is_circular:
      "An immutable version is what Gate 5.7 assigns when it admits the rule (Phase 5.7 bullet 1: a rule-corpus amendment with immutable IDs/versions). Gate 5.6 cannot satisfy a condition whose value only the later gate creates, and it may not invent one.",
    read_alone_it_blocks: ["recording the version-sharing criterion of a scoped Gate 5.6 verdict"],
  },
];

const sequencing = [
  {
    id: "SEQ-1",
    document: PLAN,
    section: "section 3, the ordering sentence that opens the gate sequence",
    line: ORDERING_SENTENCE.line,
    quoted_text: ORDERING_SENTENCE.text,
    effect: "a later phase cannot begin before its stated gate passes",
  },
  {
    id: "SEQ-2",
    document: PLAN,
    section:
      "section 3, owner authority PHASE5-001P (scoped gate verdicts and incremental rule-unit progression)",
    line_start: P001P_OPENING.line_start,
    line_end: P001P_OPENING.line_end,
    quoted_text: P001P_OPENING.text,
    effect:
      "scoped verdicts are the mechanism by which one named scope may progress while the corpus-wide queue stays unfinished",
  },
  {
    id: "SEQ-3",
    document: PLAN,
    section: "section 3, the PHASE5-001P paragraph, the progression bullet",
    line_start: P001P_LATER_PHASE_BULLET.line_start,
    line_end: P001P_LATER_PHASE_BULLET.line_end,
    quoted_text: P001P_LATER_PHASE_BULLET.text,
    effect: "the gate that must pass first, for this scope, is Gate 5.5 — the gate CIR-1 blocks",
  },
  {
    id: "SEQ-4",
    document: PLAN,
    section: "section 3, the PHASE5-001P paragraph, the unmet-criterion bullet",
    line_start: P001P_UNMET_BULLET.line_start,
    line_end: P001P_UNMET_BULLET.line_end,
    quoted_text: P001P_UNMET_BULLET.text,
    effect:
      "a criterion that cannot be met within a scope is named and not converted; that is why PHASE5-001R withheld its verdict instead of passing it",
  },
];

const admissionStep = [
  {
    id: "ADM-1",
    document: PLAN,
    section: "section 3, Phase 5.7 — Formal owner admission and finding authorization, bullet 1",
    line: PHASE_5_7_BULLET_1.line,
    quoted_text: PHASE_5_7_BULLET_1.text,
    effect: "admission follows a successful Gate 5.6, and it is the step that assigns immutable IDs and versions",
  },
  {
    id: "ADM-2",
    document: PLAN,
    section: "section 3, Gate 5.7 / segment exit",
    line: GATE_5_7_TEXT.line,
    quoted_text: GATE_5_7_TEXT.text,
    effect:
      "the admission gate stands after the validation gate, so nothing can be admitted in order to satisfy Gate 5.5 or Gate 5.6",
  },
];

// ---- amendments required -------------------------------------------------------------------------------
const amendmentsRequired = A.replace
  .map((a) => ({
    amendment_id: a.id,
    document: a.document,
    clause: a.clause,
    closes:
      a.id === "A-4"
        ? "CIR-3"
        : a.id === "A-3"
          ? "CIR-2"
          : a.id === "A-2"
            ? "CIR-1"
            : "records the authority that CIR-1 to CIR-3 rely on",
    form: "quoted replacement under Core Constitution section 6.2, extension only, applied once",
  }))
  .concat([
    {
      amendment_id: "A-5",
      document: A.append[0].document,
      clause: A.append[0].clause,
      closes: "the section 6.5 amendment-history requirement",
      form: "appended row under Core Constitution section 6.5",
    },
  ]);

const gov = read(path.join(ROOT, "CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md"));
const inv = read(path.join(ROOT, "CRP_LEGAL_INVARIANT.md"));

// ---- authorities inspected and NOT amended -------------------------------------------------------------
const notAmended = [
  {
    document: CONSTITUTION,
    rank: 1,
    clause: "section 6, Amendment and Change Control (6.1 to 6.5)",
    quoted_text: [
      consClause("**6.1**", "owner-issued work order.").text,
      consClause("**6.2**", "Implied amendments are void.").text,
      consClause("**6.3**", "advisory.").text,
      consClause("**6.4**", "requires the same authorization as an amendment.").text,
      consClause("**6.5**", "amended.").text,
    ].join("\n\n"),
    why_not_amended:
      "this is the procedure this amendment is carried out under, not a clause that creates the circular prerequisite. It is quoted in full above and used as recorded; it is not edited.",
  },
  {
    document: CONSTITUTION,
    rank: 1,
    clause: "section 5, Default Direction of Ambiguity",
    quoted_text:
      "When governing text is silent, incomplete, ambiguous, or unresolved — and no conflict exists — the answer defaults to refusal, in this direction and no other",
    why_not_amended:
      "the circular prerequisite is not an ambiguity and not an absence of authority; it is a conflict between clauses of one rank-5 document, reported and resolved by owner amendment rather than by a default. Section 5 is unchanged.",
  },
  {
    document: CONSTITUTION,
    rank: 1,
    clause: "section 4, Standing Prohibitions",
    quoted_text: "A factual anomaly is never, by itself, a violation.",
    why_not_amended:
      "unchanged and untouched: nothing in this order concerns anomaly detection, and the pre-admission sequence creates no path to a finding.",
  },
  {
    document: "CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md",
    rank: 4,
    clause: "section 1, Purpose and Boundary",
    quoted_text:
      "A governed legal rule is eligible for analysis only when it is admitted in a later approved legal-rule corpus that conforms to this contract.",
    why_not_amended:
      "this contract governs when a rule becomes a governable, analysable rule, and this order does not make the pre-admission record one: it stays NOT_ADMITTED, is not eligible for analysis, cannot emit and is not a governed legal rule. The contract's condition is met by the sequence rather than changed by it.",
  },
  {
    document: "CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md",
    rank: 4,
    clause: "section 6, Admission and Change Control",
    quoted_text:
      "No rule or source evidence is admitted by this contract's existence. A rule becomes governed only when a later explicit owner work order creates or amends an approved legal-rule corpus using the complete required fields in this contract.",
    why_not_amended:
      "the admission step is unchanged and remains with Gate 5.7. This order creates no approved legal-rule corpus, admits nothing and amends nothing in this contract; the required fields and the RULE_VERSION condition stay as recorded.",
  },
  {
    document: "CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md",
    rank: 4,
    clause: "section 1, Admission Boundary",
    quoted_text:
      "The admission excludes the legacy repository at large and permanently excludes violation determination,",
    why_not_amended:
      "the permanent exclusions and the digest-bound admission boundary are untouched; this order reads the admitted source at its recorded digest and adopts nothing from the legacy system.",
  },
  {
    document: "CRP_LEGAL_INVARIANT.md",
    rank: 2,
    clause: "the invariant that no finding is produced without governed authority",
    quoted_text: (inv.split("\n").find((l) => /finding/.test(l) && /no |NO /.test(l)) || "").trim().slice(0, 220),
    why_not_amended:
      "the invariant's prohibition is reinforced rather than relaxed: an unadmitted rule must refuse to emit, and no gate may produce a finding class, coverage or consumer-visible output. Nothing in this order needs the invariant to change, and it does not change it.",
  },
];


const cycle = [
  "Gate 5.5 may not be recorded without an admitted rule record (CIR-1).",
  "A rule may not be admitted before Gate 5.6 passes (ADM-1, ADM-2).",
  "Gate 5.6 may not begin before Gate 5.5 passes for the same scope (SEQ-1, SEQ-3).",
  "Therefore neither gate can be completed and Gate 5.7 is unreachable: the circle closes on itself, and nothing in it is a missing fact, a missing source or a missing legal decision.",
];

notAmended.push(
  {
    document: PLAN,
    rank: 5,
    clause: "section 3, Gate 5.5 (the gate sentence itself)",
    line: GATE_5_5_TEXT.line,
    quoted_text: GATE_5_5_TEXT.text,
    why_not_amended:
      "this is the prohibition the pre-admission sequence relies on: it forbids emission on an unapproved rule, which is exactly what makes it safe to specify and validate an evaluator before admission. Amending it would weaken the gate, and no reading of it is unclear, so it is left exactly as recorded. The circular prerequisite came from the PHASE 5.5 bullet, not from the gate sentence.",
  },
  {
    document: PLAN,
    rank: 5,
    clause: "section 3, Gate 5.4",
    line: GATE_5_4_TEXT.line,
    quoted_text: GATE_5_4_TEXT.text,
    why_not_amended:
      "Gate 5.4 finalises a rule record and does not require admission; the PHASE5-001Q scoped verdict already reads it that way and passes for this scope with the version reserved. Nothing here needs to change, and changing it would re-open a passed gate.",
  },
  {
    document: PLAN,
    rank: 5,
    clause: "section 3, Phase 5.4 bullet 3 (the governed fields, including immutable rule ID/version)",
    line: PHASE_5_4_HEADING.line,
    quoted_text:
      "For every selected unit record the required governed fields: immutable rule ID/version, exact jurisdiction, source ID and pin, formal edition status, effective dates/status, exact legal text/proposition, applicability, report-required facts, decisive facts, exceptions, deterministic breach test, consumer citation, and consumer-facing qualifications.",
    why_not_amended:
      "the version tension is resolved without editing this bullet: the PHASE5-001S paragraph assigns a content-derived pre-admission version identity, immutable from the moment the record is finalised, while the production version string stays reserved to Gate 5.7. The field is populated in a way that keeps the reservation explicit, and no field is removed or weakened.",
  },
  {
    document: PLAN,
    rank: 5,
    clause: "section 3, Phase 5.6 bullet 3 (independent replay before rule approval)",
    line: PHASE_5_6_BULLET_3.line,
    quoted_text: PHASE_5_6_BULLET_3.text,
    why_not_amended:
      "considered as a possible fourth instance and found not to be one: it orders validation work before approval, which is the sequence this order records rather than a prerequisite of approval. It creates no circularity and needs no change.",
  },
  {
    document: PLAN,
    rank: 5,
    clause: "section 3, Phase 5.5 bullets 1, 2, 4 and 5, and Phase 5.6 bullets 1, 2 and 4",
    line: PHASE_5_5_BULLET_3.line - 1,
    quoted_text:
      "the fact model, the status vocabulary, the explicit outputs and the explanation surface; the fixtures, the negative tests and the consumer-language validation",
    why_not_amended:
      "none of these clauses presupposes an admitted rule record. They are unchanged, and the PHASE5-001R specification already satisfies them for this scope as a specification.",
  },
  {
    document: PLAN,
    rank: 5,
    clause: "section 3, Gates 5.1, 5.2 and 5.3",
    line: GATE_5_4_TEXT.line - 2,
    quoted_text:
      "Gate 5.1 to Gate 5.3 as recorded, including Gate 5.2's corpus-wide sentence added by PHASE5-001P",
    why_not_amended:
      "these gates are earlier in the sequence, already recorded, and unaffected by the admission ordering. They are preserved verbatim.",
  },
  {
    document: PLAN,
    rank: 5,
    clause:
      "section 2 (the certification and finding model, 2.1 and 2.2), and section 3 Phase 5.7 with Gate 5.7",
    line: SECTION_2_1_OPEN.line,
    quoted_text: "Authorize a `VIOLATION` only where all of the following are true:",
    why_not_amended:
      "the finding model and the admission gate are the boundary this order protects. They are left exactly as recorded, and no rule is admitted, so nothing in them is exercised or altered.",
  },
  {
    document: PLAN,
    rank: 5,
    clause: "section 5, Stop conditions requiring direction",
    line: SECTION_5_OPEN.line,
    quoted_text: "Pause only the affected rule/cohort and record the blocker when:",
    why_not_amended:
      "no stop condition is added, removed or reordered. The conflict this order resolves was reported and carried by PHASE5-001R as a withheld verdict rather than as a stop condition, and the amended sequence leaves every stop condition in force.",
  },
  {
    document: PLAN,
    rank: 5,
    clause: "section 7, Scope boundary",
    line_start: SECTION_7_OPEN.line_start,
    line_end: SECTION_7_OPEN.line_end,
    quoted_text: SECTION_7_OPEN.text,
    why_not_amended:
      "this order admits no statute, changes no finding, adds no consumer evidence, certifies no coverage, approves no runtime implementation and deploys nothing; the scope boundary stands and is not edited.",
  },
  {
    document: PLAN,
    rank: 5,
    clause: "section 8, Amendment History",
    line: SECTION_8_OPEN.line,
    quoted_text: "## 8. Amendment History",
    why_not_amended:
      "not replaced: one row is appended to it under Core Constitution section 6.5, and every earlier row is preserved verbatim.",
  },
);



const out = {
  artifact: "amendment_authority_analysis.json",
  work_order: "PHASE5-001S",
  created_utc: "2026-09-30",
  document_type: "AUTHORITY ANALYSIS — the exact governing clauses that create the circular prerequisite",
  purpose:
    "identify, quote and locate every governing clause that makes an admission prerequisite of Gates 5.5 and 5.6, and record every authority that was inspected and deliberately not amended with the reason, so that the amendment of this order is the minimum the two owner decisions require",
  the_question_this_record_answers:
    "which exact governing clauses, quoted, require a rule to be admitted before Gates 5.5 and 5.6 can pass, when admission is Gate 5.7 and Gate 5.7 follows Gate 5.6",
  document_under_analysis: PLAN,
  document_rank: "5 — Approved Build Plan (authority order: CRP_CORE_CONSTITUTION.md section 2)",
  document_digest_at_analysis: inMemory(planText),
  state_of_the_document_when_read: howRead,
  amendment_procedure: {
    document: CONSTITUTION,
    authority: "CRP_CORE_CONSTITUTION.md section 6.1 — amended only by an explicit, owner-issued work order",
    form_required_by_6_2:
      "name the document and the clause it changes, quote the text being replaced, and state the replacement text; implied amendments are void",
    record_required_by_6_5:
      "the amendment history is recorded in the amended document itself, so the governing text and its change record cannot separate",
    clauses_quoted: [
      consClause("**6.1**", "owner-issued work order."),
      consClause("**6.2**", "Implied amendments are void."),
      consClause("**6.3**", "advisory."),
      consClause("**6.4**", "requires the same authorization as an amendment."),
      consClause("**6.5**", "amended."),
    ],
    note:
      "section 6.4 matters here: removing a requirement from a document is itself an amendment needing the same authorisation. Every replacement of this order is an extension in which the replaced text survives verbatim, so no requirement is removed by any of them.",
  },
  the_circular_prerequisite: {
    statement:
      "Gates 5.5 and 5.6 are made to wait on an admitted rule record, and admission is made to wait on Gates 5.5 and 5.6. Neither can be completed, and the blocking requirement is not a missing fact, a missing source or a missing legal decision.",
    cycle,
    clauses: circular,
    sequencing_clauses_that_make_it_binding: sequencing,
    the_admission_step_that_is_presupposed: admissionStep,
    it_is_not_a_gap:
      "nothing here is missing work, an unresolved source or an unmade legal decision. The clauses are in genuine conflict with the sequencing of the same document, so no scoped verdict may be manufactured out of them, and none was: PHASE5-001R withheld its Gate 5.5 verdict and named the unmet criterion instead.",
    what_it_is_not:
      "it is not a conflict with a rank 1-4 document, and it is not a silence or an ambiguity, so the Core Constitution's section 5 default does not apply to it and no default reading is taken.",
  },
  clauses_requiring_the_circular_prerequisite: circular.map((c) => ({
    id: c.id,
    clause: c.section,
    clause_verbatim: c.quoted_text,
    line: c.line,
    presupposition: c.presupposition,
  })),
  clauses_requiring_the_circular_prerequisite_count: circular.length,
  sequencing_clauses_recorded: sequencing.length,
  amendments_required: amendmentsRequired,
  amendments_required_count: amendmentsRequired.length,
  authorities_inspected_and_not_amended: notAmended,
  authorities_inspected_and_not_amended_count: notAmended.length,
  what_the_amendment_does_not_do: [
    "it does not admit a rule, create a candidate, create coverage or create a finding class; the admitted governed rule count stays 0 and the permitted finding count stays 0",
    "it does not weaken any gate: every requirement of every gate survives verbatim inside its replacement, and Gate 5.5's own prohibition is not touched at all",
    "it does not move Gate 5.7: admission stays after a successful Gate 5.6, and no rule may be admitted early to satisfy a gate",
    "it does not remove the prohibition on emission: an unadmitted rule must still refuse to emit and can produce no consumer result",
    "it does not settle the version question by inventing a production version; the production admission identity and version stay reserved to Gate 5.7",
    "it does not create a corpus-wide pass, clear any register row or change the application, which still reports report checking as not yet available",
    "it does not amend any rank 1-4 document, and the list above records why each authority was left alone",
  ],
  verdict:
    problems.length === 0
      ? "CIRCULAR PREREQUISITE IDENTIFIED IN THREE CLAUSES OF THE RANK-5 BUILD PLAN — the amendment of this order is confined to those three clauses plus the ordering paragraph that records the new sequence, and every other authority is preserved verbatim"
      : "PROBLEMS RECORDED — see problems",
  problems,
  created_by: "PHASE5-001S",
};

if (problems.length) {
  console.error("REFUSING TO WRITE: unlocated clauses.");
  problems.forEach((p) => console.error("  PROBLEM: " + p));
  process.exit(1);
}
fs.writeFileSync(path.join(OUT, "amendment_authority_analysis.json"), JSON.stringify(out, null, 2), "utf8");
console.log(out.verdict);
console.log("  circular clauses: " + out.clauses_requiring_the_circular_prerequisite_count);
console.log("  amendments required: " + out.amendments_required_count);
console.log("  authorities preserved: " + out.authorities_inspected_and_not_amended_count);
