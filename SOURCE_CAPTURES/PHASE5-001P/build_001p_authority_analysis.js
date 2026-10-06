/**
 * build_001p_authority_analysis.js — writes amendment_authority_analysis.json for PHASE5-001P.
 *
 * Step 1's deliverable: which governing clauses require corpus-wide completion before individual-unit
 * progression, quoted and located; the amendment procedure the Constitution names; which clauses were
 * amended; and which were deliberately left alone with the reason each.
 *
 * "located_at_line_before" is the line measured by direct read of the unamended document during this order;
 * "located_at_line_after" is measured from the amended file, so both ends of every edit are on the record.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = "C:\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001P");
const read = (p) => fs.readFileSync(p, "utf8");
const sha256File = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").toUpperCase();
const lineOf = (doc, needle) => {
  const t = read(path.join(ROOT, doc));
  const i = t.indexOf(needle);
  return i < 0 ? null : t.slice(0, i).split("\n").length;
};
const PLAN = "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md";

const clauses = [
  {
    id: "C-1",
    document: PLAN,
    clause: "section 3, the ordering sentence that opens the gate sequence",
    located_at_line_before: 45,
    located_at_line_after: lineOf(PLAN, "**Owner authority PHASE5-001P"),
    quoted_text:
      "Work proceeds in the following order. A later phase cannot begin before its stated gate passes. Record completed and blocked items in durable artifacts; do not rely on conversation-only decisions as certification records.",
    why_it_requires_corpus_wide_completion:
      "Every gate in this plan quantifies over the whole catalogue (Gate 5.1 'every source ID', Gate 5.2 'all 437 entries'). Read with no scope, the sentence makes a phase that names one rule unit wait for a corpus-wide gate, so one unit's independently supported work cannot progress while 409 rows are unfinished.",
    disposition: "AMENDED",
    amendment_id: "A-1",
    replacement_effect:
      "the sentence is kept verbatim and a scoped-progression paragraph is added after it, so a gate may also be recorded as passed for one explicitly named scope, a later phase may begin for that scope only when every preceding gate passes for the same scope, and corpus-wide gate conditions and the unfinished queue are preserved and recorded separately",
  },
  {
    id: "C-2",
    document: PLAN,
    clause: "section 3, Gate 5.2",
    located_at_line_before: 87,
    located_at_line_after: lineOf(PLAN, "**Gate 5.2:**"),
    quoted_text:
      "**Gate 5.2:** all 437 entries have a reconciled report-only disposition or a documented reason they are not assessable; every unresolved record has a concrete report-mapping task or is an irreducible gap/refusal. Legal/source fields are accepted under PHASE5-001A, not re-litigated. No batch is accepted based solely on an unverified completion summary.",
    why_it_requires_corpus_wide_completion:
      "the criterion is quantified over 'all 437 entries', so under the unamended text any verdict on this gate for a unit would have to be read as a corpus-wide verdict, which this order is forbidden to claim.",
    disposition: "AMENDED",
    amendment_id: "A-2",
    replacement_effect:
      "the criterion is kept verbatim and the gate is recorded as corpus-wide and unpassed while any entry lacks a disposition, with a scoped verdict read against the records inside its named scope only and neither stating nor implying that the corpus-wide condition is satisfied",
  },
  {
    id: "C-3",
    document: PLAN,
    clause: "section 3, Phase 5.3, bullet 1",
    located_at_line_before: 91,
    located_at_line_after: lineOf(PLAN, "- Inventory the actual consumer-report formats/fields"),
    quoted_text:
      "- Inventory the actual consumer-report formats/fields that the future application is intended to support. Do not use the old detector's field limitations as the new product boundary.",
    why_it_requires_corpus_wide_completion:
      "the bullet asks for an inventory of the formats 'the future application is intended to support', which is a corpus-wide inventory question. PHASE5-001I-C recorded it as the one Phase 5.3 criterion that was UNMET, and it was the second reason that gate could not pass.",
    disposition: "AMENDED",
    amendment_id: "A-3",
    replacement_effect:
      "the bullet is kept verbatim and given its scoped reading: for a named scope the intended format is the presentation that scope names, every other format is recorded as unsupported and not inventoried, and no corpus-wide intended-format inventory is created or implied",
  },
];

const clausesExtra = [
  {
    id: "C-4",
    document: PLAN,
    clause: "section 3, Gate 5.3",
    located_at_line_before: 96,
    located_at_line_after: lineOf(PLAN, "**Gate 5.3:**"),
    quoted_text:
      "**Gate 5.3:** each proposed candidate has a verifiable report representation and exact location, or remains explicitly unresolved/excluded with a source-grounded reason. No rule enters certification merely because a field seems likely to exist.",
    why_it_requires_corpus_wide_completion:
      "it does not. The criterion is already per-candidate, and its second clause already permits an explicitly unresolved item with a source-grounded reason, which is exactly the state of the default-in-payment alternative on this specimen.",
    disposition: "NOT_AMENDED — no corpus-wide requirement to remove",
    amendment_id: null,
    replacement_effect: null,
  },
  {
    id: "C-5",
    document: PLAN,
    clause: "section 3, Gate 5.1",
    located_at_line_before: 76,
    located_at_line_after: lineOf(PLAN, "**Gate 5.1:**"),
    quoted_text:
      "**Gate 5.1:** every source ID is accounted for once, all counts reconcile to the extent the recorded evidence permits, duplicate links are explicit, and no unresolved item was silently excluded.",
    why_it_requires_corpus_wide_completion:
      "it is corpus-wide by its own words, but the PHASE5-001O amendment already records it as met with recorded administrative limitations, so it is not the clause that blocks unit progression. The scoped model does not relax it and does not re-open it.",
    disposition: "NOT_AMENDED — already met with recorded administrative limitations; a scoped verdict does not touch it",
    amendment_id: null,
    replacement_effect: null,
  },
  {
    id: "C-6",
    document: PLAN,
    clause: "section 6, the PHASE5-001B continuation instruction",
    located_at_line_before: 166,
    located_at_line_after: lineOf(PLAN, "Then continue remaining batches autonomously until Gate 5.2 passes"),
    quoted_text:
      "Then continue remaining batches autonomously until Gate 5.2 passes, pausing only for a material owner/legal decision.",
    why_it_requires_corpus_wide_completion:
      "it directs the batch program to run until the corpus-wide gate passes. It governs the queue's continuation, not unit progression, and the queue is preserved unchanged by this order. Amending it would risk reading as though the corpus-wide queue were waived, which the owner expressly forbade.",
    disposition:
      "NOT_AMENDED — the queue instruction is preserved; the ordering effect on unit progression is removed by C-1's scoped paragraph, which states that the queue stays as recorded",
    amendment_id: null,
    replacement_effect: null,
  },
  {
    id: "C-7",
    document: PLAN,
    clause: "section 3, Gate 5.4 to Gate 5.7",
    located_at_line_before: null,
    located_at_line_after: null,
    quoted_text:
      "**Gate 5.4:** each proposed rule has a complete field-by-field trace to the owner-approved source, exact jurisdiction/limb, no unresolved affirmative element, and a deterministic test. (Gate 5.5, 5.6 and 5.7 are likewise per-rule or per-unit in their own text.)",
    why_it_requires_corpus_wide_completion: "they do not. Each addresses one proposed rule or one evaluator, so a scoped reading is unnecessary.",
    disposition: "NOT_AMENDED",
    amendment_id: null,
    replacement_effect: null,
  },
  {
    id: "C-8",
    document:
      "CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md, CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md, CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md, CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md",
    clause: "the rank-4 clauses, inspected in full",
    located_at_line_before: null,
    located_at_line_after: null,
    quoted_text:
      "the expansion contract section 6 candidate gate ('a discovery record may be marked CONFIRMED_CANDIDATE only when …'); the corpus contract section 6 admission clause ('Until a conforming legal-rule corpus is explicitly approved, every candidate issue has no applicable governed rule'); the PHASE5-001O acceptance directive",
    why_it_requires_corpus_wide_completion:
      "none of them does. The candidate gate is per-candidate, the admission clause governs adoption, and the acceptance directive is per-statute. No rank-4 clause requires corpus-wide completion before individual-unit progression.",
    disposition: "NOT_AMENDED — nothing to amend; their conditions are preserved and no admission is made",
    amendment_id: null,
    replacement_effect: null,
  },
  {
    id: "C-9",
    document: "CRP_PHASE5_NEXT_GATE_RECONCILIATION.md and the earlier PHASE5-001x records",
    clause: "the rank-6 readings of the corpus-wide sequence (section 4.2 begins at line 195 of that document; the quoted sentence is at line 197)",
    located_at_line_before: 197,
    located_at_line_after: null,
    quoted_text:
      'Gate 5.2 asks for "all 437 entries … a reconciled report-only disposition or a documented reason they are not assessable". A disposition cannot be reconciled against an inventory that does not exist.',
    why_it_requires_corpus_wide_completion:
      "the rank-6 records carry the corpus-wide reading forward and record it as unmet. They rank below the amended rank-5 text, so they cannot keep the removed requirement alive; they are also records of what was recorded at their time, and rewriting a completion record is the alteration the procedure forbids.",
    disposition:
      "NOT_AMENDED — rank 6; read subject to the amended rank-5 text and reconciled in reference_reconciliation.json without being rewritten",
    amendment_id: null,
    replacement_effect: null,
  },
];

for (const c of clausesExtra) clauses.push(c);


const out = {
  artifact: "amendment_authority_analysis.json",
  work_order: "PHASE5-001P",
  step: "step 1 and step 2 — establish the corpus-wide-progression clauses and the amendment procedure, before any write",
  documents_read_before_writing: [
    "CRP_CORE_CONSTITUTION.md (rank 1)",
    "CRP_LEGAL_INVARIANT.md (rank 2)",
    "JURISDICTION_CONTRACT.md (rank 3)",
    "CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md (rank 4)",
    "CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md (rank 4)",
    "CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md (rank 4)",
    "CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md (rank 4)",
    "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md (rank 5, the amendment target)",
    "CRP_PHASE5_NEXT_GATE_RECONCILIATION.md (rank 6)",
    "the PHASE5-001I-C package, the PHASE5-001I-B package, the PHASE5-001I-A records, the PHASE5-001K register and provenance, the PHASE5-001L/M/N/O records, the PROD-003 records, CRP_CORRECTED_LOGIC_RESCREEN_REGISTER.md",
  ],
  document_precedence: {
    source: "CRP_CORE_CONSTITUTION.md section 2, Authority Order",
    hierarchy_verbatim:
      "1. Core Constitution  2. Legal Invariant  3. Jurisdiction Contract  4. Corpus Contract  5. Approved Build Plan  6. Active Work Order  7. Approved Tests  8. Implementation  9. Comments  10. Legacy Material",
    clause_2_1_verbatim:
      "Authority is determined by rank alone. It is never determined by recency, document length, specificity, the number of artifacts that agree, passing test results, reviewer preference, or implementation convenience.",
    clause_2_2_verbatim: "A lower-ranked artifact never overrides a higher-ranked artifact.",
    consequence_established:
      "The corpus-wide progression requirement lived in the rank-5 plan alone. A rank-6 order cannot remove it by preference, which is why PHASE5-001I-C refused to adopt PROD-003's inference that Phase 5.4 could begin for one unit: only an owner amendment could change the plan's text, and this order is that amendment.",
  },
  amendment_procedure: {
    source: "CRP_CORE_CONSTITUTION.md section 6, read with section 3.2 step 3",
    clauses_quoted: [
      "6.1 This constitution and every other rank 1-3 document are amended only by an explicit, owner-issued work order. No amendment occurs by implementation, refactor, test change, comment, migration, or documentation drift.",
      "6.2 An amendment must name the document and the clause it changes, quote the text being replaced, and state the replacement text. Implied amendments are void.",
      "6.4 Deletion of a rank 1-3 document, or removal of a requirement from one, is an amendment and requires the same authorization as an amendment.",
      "6.5 Amendment history is recorded in the amended document itself, so that the governing text and its change record cannot separate. A rank 1-3 document with no amendment history has never been amended.",
      "3.2 step 3 — amending a governing document is an owner amendment under Section 6 (an Active Work Order, rank 6), not a repair performed during implementation.",
    ],
    procedure_followed: [
      "Owner issuance: PHASE5-001P is the owner-issued instrument; it authorizes the incremental-progression model and names the scope.",
      "Form: each amendment names the document and clause, quotes the replaced text verbatim and states the replacement text. Every replacement extends the quoted text rather than replacing a requirement, so no requirement is removed.",
      "In-document history: one row was appended to the amended document's own section 8 Amendment History.",
      "Proof: the exact replaced and replacement text, the before/after digests and an inversion check that reconstructs the pre-amendment bytes are recorded in amendment_text.json; the corrected intermediate state is recorded in revert_001p_amendments_result.json.",
    ],
    authority_check: {
      question: "Did the procedure require authority beyond the owner's instruction, and did any stop condition under section 3 arise?",
      answer: "NO stop condition was reached, and the highest form the procedure names was used.",
      basis: [
        "The owner issued this order, fixed the scope and authorized exactly these governing-document changes. No lesser instrument was relied on.",
        "No rank 1-3 document was touched, no requirement was deleted or weakened, and section 5's refusal direction is untouched: a scoped verdict still admits no rule and authorizes no finding.",
        "The corpus-wide queue, the register, the provenance, the ledger, the crosswalk and every historical manifest are preserved; nothing was retroactively authorized.",
      ],
    },
  },
  clauses_requiring_corpus_wide_completion: clauses,
  clauses_amended: clauses.filter((c) => c.disposition === "AMENDED").map((c) => c.id),
  clauses_left_unchanged: clauses.filter((c) => c.disposition !== "AMENDED").map((c) => ({ id: c.id, why: c.disposition })),
};


out.target_identified_before_editing = {
  document: PLAN,
  before_sha256: JSON.parse(read(path.join(OUT, "preserved_files_before.json"))).files.find((f) => f.relative_path === PLAN).sha256,
  after_sha256: sha256File(path.join(ROOT, PLAN)),
  clauses_edited: [
    "section 3, ordering sentence (A-1)",
    "section 3, Gate 5.2 (A-2)",
    "section 3, Phase 5.3 bullet 1 (A-3)",
    "section 8, Amendment History (A-4)",
  ],
};
out.boundaries = {
  nothing_else_edited: [
    "No other governing document was edited.",
    "The register, the provenance, the coverage ledger, the crosswalk, the catalogue, the application and every historical manifest remain byte-identical to their baseline digests; the amended plan is the only pre-existing file whose digest changed.",
  ],
  what_the_amendments_do_not_do: [
    "They pass no corpus-wide gate and convert no corpus-wide condition into a scoped verdict.",
    "They admit no rule, create no coverage, create no candidate and authorize no finding class.",
    "They do not convert any missing work into a GAP or a REFUSAL.",
    "They do not retroactively authorize the earlier custody discrepancies recorded by PHASE5-001I-B and PHASE5-001I-C.",
  ],
};
out.created_by = "PHASE5-001P";

fs.writeFileSync(path.join(OUT, "amendment_authority_analysis.json"), JSON.stringify(out, null, 2), "utf8");
console.log(
  "clauses assessed:",
  clauses.length,
  "| amended:",
  out.clauses_amended.join(","),
  "| target before:",
  out.target_identified_before_editing.before_sha256,
  "| after:",
  out.target_identified_before_editing.after_sha256
);
