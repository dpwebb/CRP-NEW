/**
 * amendments_001s.js — the exact amendment set performed by PHASE5-001S.
 *
 * Every amendment here is a quoted replacement under CRP_CORE_CONSTITUTION.md section 6.2: the document
 * and the clause are named, the text being replaced is quoted, and the replacement text is stated. No
 * implied amendment is made, and no clause outside this list is edited.
 *
 * Two properties are deliberate and are measured later:
 *
 *  1. EXTENSION ONLY. Every replacement text contains its replaced text verbatim (the replaced text is a
 *     prefix of the replacement text). Nothing is deleted, narrowed or removed, so Core Constitution
 *     section 6.4 — which treats the removal of a requirement as an amendment — is satisfied without
 *     removing anything: each amendment only records which rule record a gate may read.
 *
 *  2. ONE TARGET DOCUMENT. The circular prerequisite is created by the rank-5 Approved Build Plan's gate
 *     sequence, not by the rank 1-4 documents. Only that document is amended. The authorities inspected
 *     and deliberately NOT amended, with the reason for each, are recorded in
 *     amendment_authority_analysis.json.
 */

const PHASE_5_5_BULLET_3 =
  "- Implement deterministic rule evaluators that take only the uploaded report's resolved facts plus admitted rule records. Keep legal research, parsing, candidate classification, and finding evaluation as separately auditable steps.";

const SECTION_4_ITEM_5 =
  "5. Deterministic fact/evaluator specification and implementation, only after rule units and report mappings are admitted; the section 3 internal-validation carve-out is not that specification or implementation, is not gate evidence, and admits nothing.";

const GATE_5_6_TEXT =
  "**Gate 5.6:** every test passes; independent replay reproduces each sampled result; no known false positive/negative category remains unexplained; rule corpus, source crosswalk, tests, and explanation templates share the same immutable versions.";

const P001P_LAST_BULLET = [
  "- **No scoped verdict admits a rule,** creates coverage or a candidate, authorizes a finding class, or",
  "  changes the recorded state of the application, which still reports report checking as not yet",
  "  available.",
].join("\n");

const PRE_ADMISSION_PARAGRAPH = [
  "",
  "",
  "**Owner authority PHASE5-001S — pre-admission specification and validation sequence.** This paragraph",
  "names the sequence in which a rule record is finalised, specified, validated and admitted, and it",
  "weakens no gate's own conditions.",
  "",
  "- **The gates are separated by what each one reads.** Gate 5.4 finalises the governed rule record for a",
  "  named scope. Gates 5.5 and 5.6 read that finalised record whether or not Gate 5.7 has admitted it.",
  "  Gate 5.7 remains the only step that admits a governed rule, and it remains the step that follows a",
  "  successful Gate 5.6. Admission is not a precondition of specifying or validating an evaluator; it is",
  "  the precondition of emitting a result.",
  "- **A pre-admission rule record is a pinned, scoped record.** It carries its immutable rule ID, its",
  "  source pin, its exact jurisdiction and statutory limb, its determined test, and a recorded",
  "  pre-admission version identity derived from the record's own content. Its production admission",
  "  identity and its production version string remain reserved to Gate 5.7.",
  "- **An unadmitted rule can never emit a consumer result.** Until Gate 5.7 admits it, the evaluator must",
  "  refuse to emit on it: a named refusal and no result. No gate may produce a finding class, coverage or",
  "  consumer-visible output from a pre-admission record.",
  "- **No rule may be admitted early to satisfy a gate.** Admission is not a Gate 5.5 or Gate 5.6",
  "  deliverable, and a rule may not be admitted in order to make a gate criterion pass.",
  "- **Nothing is removed by this paragraph.** Each gate's own conditions, each stop condition, the finding",
  "  boundary, the permanent exclusions and the authority order are unchanged; this paragraph only records",
  "  which rule record the specification and validation gates may read while Gate 5.7 has not yet admitted",
  "  it. It admits no rule by itself and it creates no coverage, no candidate and no finding class.",
].join("\n");


const AMENDMENT_HISTORY_ROW =
  "| 2026-09-30 | PHASE5-001S | Valid owner amendment under Core Constitution section 6: section 3's scoped-progression paragraph gains the pre-admission specification and validation sequence paragraph (owner authority PHASE5-001S) — Gate 5.4 finalises a rule record and Gates 5.5 and 5.6 read that finalised record whether or not Gate 5.7 has admitted it, a pre-admission record is pinned by its immutable rule ID and a content-derived pre-admission version identity while its production admission identity and version stay reserved to Gate 5.7, an unadmitted rule must still refuse to emit and can never produce a finding class, coverage or consumer-visible output, and no rule may be admitted early to satisfy a gate; section 3 Phase 5.5 bullet 3 records how the phrase `admitted rule records` is read for a named scope; section 4 item 5 records that its admission precondition is the Gate 5.4 and Gate 5.3 pass for the named scope rather than Gate 5.7 admission; Gate 5.6 records how its immutable-version sharing condition is measured against a pinned pre-admission rule-record version, with the production admission identity reserved to Gate 5.7 and that reservation to be named rather than passed. Gate 5.5's own sentence, Gate 5.4, the finding model, the stop conditions, the permanent exclusions and every other clause are unchanged, no requirement is removed by any of the four replacements, and no gate is passed by this amendment alone. It admits no rule, certifies no coverage, creates no finding class, changes no application behaviour and authorises no consumer-visible output. Both replaced text and replacement text are quoted in CRP_PHASE5_001S_GATE_5_5_BLOCKER_RESOLUTION.md and SOURCE_CAPTURES\\PHASE5-001S\\amendment_text.json. |";

module.exports = {
  append: [
    {
      id: "A-5",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause: "section 8, Amendment History, appended row",
      marker: "| 2026-09-30 | PHASE5-001S |",
      row: AMENDMENT_HISTORY_ROW,
    },
  ],
  replace: [
    {
      id: "A-1",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause:
        "section 3, the final bullet of the PHASE5-001P scoped-progression paragraph (the clause that closes the ordering authority)",
      replaced_text: P001P_LAST_BULLET,
      replacement_text: P001P_LAST_BULLET + PRE_ADMISSION_PARAGRAPH,
    },
    {
      id: "A-2",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause: "section 3, Phase 5.5, bullet 3 (the evaluator's inputs)",
      replaced_text: PHASE_5_5_BULLET_3,
      replacement_text:
        PHASE_5_5_BULLET_3 +
        " For a scope named under the PHASE5-001S paragraph above, `admitted rule records` in this bullet is read as the governed rule record that Gate 5.4 has finalised for that scope, read at its pinned pre-admission version: a record Gate 5.7 has not yet admitted is a valid input to this specification and to Gate 5.6, and the evaluator must still refuse to emit on it until Gate 5.7 admits it, so the emission condition Gate 5.5 itself sets is unchanged by this reading.",
    },
    {
      id: "A-3",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause:
        "section 4, Durable artifacts to create, item 5 (the deterministic fact/evaluator specification)",
      replaced_text: SECTION_4_ITEM_5,
      replacement_text:
        SECTION_4_ITEM_5 +
        " Under the PHASE5-001S paragraph, `admitted` in this item is read as passed Gate 5.4 and Gate 5.3 for the named scope: the artifact may be built and validated on the finalised rule record at its pinned pre-admission version, and it must refuse to emit on that record until Gate 5.7 admits it. Formal admission at Gate 5.7 remains the step that makes a rule production-authoritative, and it is not a precondition of this artifact.",
    },
    {
      id: "A-4",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause: "section 3, Gate 5.6 (the immutable-version sharing condition)",
      replaced_text: GATE_5_6_TEXT,
      replacement_text:
        GATE_5_6_TEXT +
        " Under the PHASE5-001S paragraph above, for a scope whose governed rule record Gate 5.7 has not yet admitted, the sharing condition is measured against that record's pinned pre-admission version identity together with the immutable digests of the crosswalk, the tests and the explanation templates the scope reads and writes; the production admission identity and version remain reserved to Gate 5.7, and a scoped Gate 5.6 verdict must name that reservation rather than treat the condition as satisfied by it.",
    },
  ],
  PHASE_5_5_BULLET_3,
  SECTION_4_ITEM_5,
  GATE_5_6_TEXT,
  P001P_LAST_BULLET,
  PRE_ADMISSION_PARAGRAPH,
  AMENDMENT_HISTORY_ROW,
};
