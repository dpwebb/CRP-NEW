/**
 * amendments_001p.js — the exact amendment set performed by PHASE5-001P.
 *
 * Every amendment here is a quoted replacement under CRP_CORE_CONSTITUTION.md section 6.2: the document
 * and clause are named, the text being replaced is quoted, and the replacement text is stated. No implied
 * amendment is made, and no clause outside this list is edited.
 *
 * Target: CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md (rank 5, Approved Build
 * Plan) — the only governing document that required corpus-wide completion before individual-unit
 * progression. The rank-4 contracts, the rank 1-3 documents and the rank-6 records were inspected and are
 * deliberately not amended; the reasons are recorded in amendment_authority_analysis.json.
 */
const SCOPED_PROGRESSION_PARAGRAPH = [
  "",
  "",
  "**Owner authority PHASE5-001P — scoped gate verdicts and incremental rule-unit progression.** This",
  "paragraph adds a scope to the sequencing sentence above. It weakens no gate's own conditions.",
  "",
  "- **Corpus-wide gates stay corpus-wide.** Gate 5.1 to Gate 5.7 keep their text exactly as recorded and",
  "  remain unfinished while any record they quantify is unresolved. They are recorded separately from any",
  "  scoped verdict. A scoped verdict is never a corpus-wide pass and never clears a row outside its scope.",
  "- **For progression purposes only, a gate may also be recorded as passed for one explicitly named",
  "  scope.** A scope names, at minimum, the jurisdiction (country and region), the rule unit, the statutory",
  "  limb, the report presentation, the evidence references it relies on, and its exclusions.",
  "- **A scoped verdict states, criterion by criterion,** the gate's own text, the state of each criterion",
  "  within that scope, the evidence for each state, and every item the scope excludes or leaves unresolved.",
  "- **A later phase may begin for a named scope only when every preceding gate carries a passing verdict",
  "  for that same scope.** A verdict does not transfer to another scope, and one passing verdict implies no",
  "  other.",
  "- **The corpus-wide unfinished queue is preserved as recorded.** A scoped verdict resolves, promotes,",
  "  re-classifies and closes no row. Missing work may not be converted into `GAP` or `REFUSAL` in order to",
  "  satisfy a criterion; where a criterion cannot be met within a scope, that scope's verdict names the",
  "  unmet criterion instead of being issued.",
  "- **No scoped verdict admits a rule,** creates coverage or a candidate, authorizes a finding class, or",
  "  changes the recorded state of the application, which still reports report checking as not yet",
  "  available.",
].join("\n");

const ORDERING_SENTENCE =
  "Work proceeds in the following order. A later phase cannot begin before its stated gate passes. Record completed and blocked items in durable artifacts; do not rely on conversation-only decisions as certification records.";

const GATE_5_2_TEXT =
  "**Gate 5.2:** all 437 entries have a reconciled report-only disposition or a documented reason they are not assessable; every unresolved record has a concrete report-mapping task or is an irreducible gap/refusal. Legal/source fields are accepted under PHASE5-001A, not re-litigated. No batch is accepted based solely on an unverified completion summary.";

const PHASE_5_3_BULLET_1 =
  "- Inventory the actual consumer-report formats/fields that the future application is intended to support. Do not use the old detector's field limitations as the new product boundary.";

module.exports = {
  append: [
    {
      id: "A-4",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause: "section 8, Amendment History, appended row",
      marker: "| 2026-09-30 | PHASE5-001P |",
      row: "| 2026-09-30 | PHASE5-001P | Valid owner amendment under Core Constitution section 6: section 3's ordering sentence gains the scoped-gate-verdict and incremental rule-unit progression paragraph (owner authority PHASE5-001P) — corpus-wide gate conditions stay unchanged and are recorded separately, a gate may also be recorded as passed for one explicitly named scope, a later phase may begin for a named scope only when every preceding gate holds a passing verdict for that same scope, the corpus-wide unfinished queue is preserved as recorded, no row is promoted or re-classified, and no missing work may be converted into GAP or REFUSAL to satisfy a criterion; Gate 5.2 records that its condition is corpus-wide and is not satisfied by a scoped verdict; Phase 5.3 bullet 1 records that a named scope's intended format is the presentation that scope names. Gate 5.3's own text is per-candidate and needed no change. It admits no rule, certifies no coverage, passes no corpus-wide gate, creates no finding class and changes no application behaviour. Both replaced text and replacement text are quoted in CRP_PHASE5_001P_INCREMENTAL_UNIT_GATE_PROGRESSION.md and SOURCE_CAPTURES\\PHASE5-001P\\amendment_text.json. |",
    },
  ],
  replace: [
    {
      id: "A-1",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause: "section 3, the ordering sentence that opens the gate sequence",
      replaced_text: ORDERING_SENTENCE,
      replacement_text: ORDERING_SENTENCE + SCOPED_PROGRESSION_PARAGRAPH,
    },
    {
      id: "A-2",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause: "section 3, Gate 5.2",
      replaced_text: GATE_5_2_TEXT,
      replacement_text:
        GATE_5_2_TEXT +
        " This condition is corpus-wide: it stays unpassed while any of the 437 entries lacks a reconciled report-only disposition or a documented reason it is not assessable, and a scoped verdict recorded under the PHASE5-001P paragraph above is read against the records inside its named scope only. Such a verdict neither states nor implies that this corpus-wide condition is satisfied.",
    },
    {
      id: "A-3",
      document: "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md",
      clause: "section 3, Phase 5.3, bullet 1 (intended-format inventory)",
      replaced_text: PHASE_5_3_BULLET_1,
      replacement_text:
        PHASE_5_3_BULLET_1 +
        " For a scope named under the PHASE5-001P paragraph above, the intended format is the presentation that scope names: recording that one presentation explicitly satisfies this bullet for that scope, and every other format is recorded as unsupported and not inventoried. No corpus-wide intended-format inventory is created or implied by that record.",
    },
  ],
  SCOPED_PROGRESSION_PARAGRAPH,
  ORDERING_SENTENCE,
  GATE_5_2_TEXT,
  PHASE_5_3_BULLET_1,
};

