/**
 * build_001p_amendment_records.js — writes amendment_text.json for PHASE5-001P.
 *
 * It proves the amendment by measurement rather than assertion:
 *  - every replacement's replacement text must be present in the amended file and the text it replaced
 *    must be gone (whitespace-normalised comparison);
 *  - the appended amendment-history row is quoted from the amended file itself;
 *  - an INVERSION check reconstructs the pre-amendment text by reversing the three replacements and removing
 *    the appended row, and requires the reconstructed text's SHA-256 to equal the baseline digest recorded
 *    in preserved_files_before.json. That proves no other byte of the document changed.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const A = require("./amendments_001p.js");

const ROOT = "C:\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001P");
const read = (p) => fs.readFileSync(p, "utf8");
const sha256Of = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex").toUpperCase();
const sha256File = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").toUpperCase();
const norm = (s) => String(s).replace(/\s+/g, " ").trim();
const lineOf = (text, needle) => {
  const idx = text.indexOf(needle);
  return idx < 0 ? null : text.slice(0, idx).split("\n").length;
};

const doc = A.replace[0].document;
const abs = path.join(ROOT, doc);
const before = JSON.parse(read(path.join(OUT, "preserved_files_before.json")));
const baselineRow = before.files.find((f) => f.relative_path === doc);
const amended = read(abs);
const amendedNorm = norm(amended);

const problems = [];
const records = [];

let reconstructed = amended;
for (const a of [...A.replace].reverse()) {
  if (!reconstructed.includes(a.replacement_text)) problems.push(a.id + ": replacement text not found while inverting");
  reconstructed = reconstructed.replace(a.replacement_text, a.replaced_text);
}
const appendedLine = amended.split("\n").find((l) => l.startsWith(A.append[0].marker));
if (appendedLine) reconstructed = reconstructed.replace(appendedLine + "\n", "");
const reconstructedDigest = sha256Of(reconstructed);
for (const a of A.replace) {
  const replacementPresent = amendedNorm.includes(norm(a.replacement_text));
  const additive = norm(a.replacement_text).includes(norm(a.replaced_text));
  const replacedStillThere = amendedNorm.includes(norm(a.replaced_text)) && !additive;
  if (!replacementPresent) problems.push(a.id + ": replacement text absent from the amended file");
  if (replacedStillThere) problems.push(a.id + ": replaced text is still present");
  records.push({
    id: a.id,
    document: a.document,
    clause: a.clause,
    type: additive ? "REPLACE_AND_EXTEND_REQUIREMENT" : "REPLACE_REQUIREMENT",
    located_at_line_before: lineOf(reconstructed, a.replaced_text),
    located_at_line_after: lineOf(amended, a.replacement_text),
    replaced_text: a.replaced_text,
    replaced_chars: a.replaced_text.length,
    replacement_text: a.replacement_text,
    replacement_chars: a.replacement_text.length,
    mechanical_check: {
      comparison_basis: "whitespace-normalised",
      replacement_text_present_in_amended_file: replacementPresent,
      replaced_text_still_present_in_amended_file: replacedStillThere,
      replacement_extends_the_replaced_text: additive,
      occurs_exactly_once_before_replacement: reconstructed.split(a.replaced_text).length - 1 === 1,
    },
    after_file: { bytes: fs.statSync(abs).size, sha256: sha256File(abs) },
  });
}

for (const a of A.append) {
  const line = amended.split("\n").find((l) => l.startsWith(a.marker));
  if (!line) problems.push(a.id + ": appended amendment-history row not found");
  records.push({
    id: a.id,
    document: a.document,
    clause: a.clause,
    type: "APPEND_AMENDMENT_HISTORY",
    located_at_line_after: lineOf(amended, a.marker),
    replaced_text: "",
    replaced_chars: 0,
    anchor_text: "| 2026-09-30 | PHASE5-001I-A |",
    replacement_text: line || null,
    replacement_chars: line ? line.length : 0,
    mechanical_check: { appended_row_present: Boolean(line) },
    after_file: { bytes: fs.statSync(abs).size, sha256: sha256File(abs) },
  });
}


const out = {
  artifact: "amendment_text.json",
  work_order: "PHASE5-001P",
  created_utc: "2026-09-30",
  purpose:
    "the exact replaced and replacement text of every amendment this order made to a governing document, with the before and after state of the amended file, so Core Constitution section 6.2 is satisfied on the record rather than in prose",
  authority: "CRP_CORE_CONSTITUTION.md sections 6.1 to 6.5",
  amendment_count: records.length,
  documents_amended: [doc],
  file_state_change: [
    {
      document: doc,
      before: baselineRow ? { bytes: baselineRow.bytes, sha256: baselineRow.sha256 } : null,
      after: { bytes: fs.statSync(abs).size, sha256: sha256File(abs) },
      changed: baselineRow ? baselineRow.sha256 !== sha256File(abs) : null,
    },
  ],
  inversion_check: {
    method:
      "the three replacements are reversed and the appended amendment-history row is removed from the amended file; the reconstruction must be byte-identical to the baseline this order measured before amending",
    baseline_sha256_from_preserved_files_before: baselineRow ? baselineRow.sha256 : null,
    reconstructed_sha256: reconstructedDigest,
    reconstruction_matches_baseline: baselineRow ? baselineRow.sha256 === reconstructedDigest : null,
    meaning:
      "a match proves the amendment consists of exactly these three replacements and this one appended row, and that no other byte of the document was altered",
  },
  mechanical_check_result: {
    problems,
    clean: problems.length === 0 && Boolean(baselineRow) && baselineRow.sha256 === reconstructedDigest,
  },
  amendments: records,
  boundaries: {
    documents_deliberately_not_amended: [
      "CRP_CORE_CONSTITUTION.md, CRP_LEGAL_INVARIANT.md, JURISDICTION_CONTRACT.md and CRP_JURISDICTION_ENUMERATION.md: no clause of theirs requires corpus-wide completion before individual-unit progression. Section 5's default direction still refuses a finding where no applicable governed rule is admitted, and section 3's conflict protocol is untouched.",
      "CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md, CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md, CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md and CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md: the corpus-wide-progression clauses are not in these rank-4 instruments. Their candidate gate is per-candidate, their acceptance directive is per-statute, and their adoption clause governs admission rather than progression. Amending them would have changed acceptance conditions this order does not touch.",
      "Gate 5.1, Gate 5.3, Gate 5.4, Gate 5.5, Gate 5.6 and Gate 5.7: each is already per-unit or per-rule in its own text, so none required a scoped reading.",
      "CRP_PHASE5_NEXT_GATE_RECONCILIATION.md and the earlier PHASE5-001x records: rank-6 analysis and completion records. They are preserved verbatim and reconciled in reference_reconciliation.json; rewriting a completion report so that it no longer records what was recorded is the alteration the procedure forbids.",
    ],
    what_this_does_not_do: [
      "No corpus-wide gate is passed, advanced, softened or waived by these amendments.",
      "No rule, coverage, candidate, finding class or certified count is created.",
      "No register row, ledger row, crosswalk entry or historical manifest is edited.",
    ],
  },
  created_by: "PHASE5-001P",
};
fs.writeFileSync(path.join(OUT, "amendment_text.json"), JSON.stringify(out, null, 2), "utf8");
console.log(
  "amendments recorded:",
  records.length,
  "| inversion matches baseline:",
  out.inversion_check.reconstruction_matches_baseline,
  "| problems:",
  problems.length
);
for (const p of problems) console.log("  PROBLEM:", p);
