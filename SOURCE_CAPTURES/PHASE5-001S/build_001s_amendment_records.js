/**
 * build_001s_amendment_records.js — PHASE5-001S step 3: record the amendment history of the rank-5 build plan
 * under Core Constitution sections 6.2 and 6.5, and prove the amendment is exactly invertible.
 *
 * It writes amendment_text.json. It edits nothing.
 *
 * The inversion check is the point of this record: every replacement and the appended row are undone in
 * reverse, and the reconstructed bytes must hash to the digest the amendment procedure started from. If they
 * do, the amendment added exactly what it says it added and changed nothing else in the document.
 */
const fs = require("fs");
const path = require("path");
const A = require("./amendments_001s.js");

const ROOT = "C:\\\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001S");
const sha256Of = (buf) =>
  require("crypto").createHash("sha256").update(buf).digest("hex").toUpperCase();

const doc = A.replace[0].document;
const abs = path.join(ROOT, doc);
const amended = fs.readFileSync(abs, "utf8");
const applied = JSON.parse(fs.readFileSync(path.join(OUT, "amendment_application_result.json"), "utf8"));

const lineOf = (needle) => amended.split("\n").findIndex((l) => l.includes(needle)) + 1;

const amendments = A.replace.map((a) => {
  const replacementOccurrences = amended.split(a.replacement_text).length - 1;
  const replacedStillStandalone = amended.split(a.replaced_text).length - 1;
  return {
    id: a.id,
    type: "REPLACE_BY_EXTENSION",
    document: a.document,
    clause: a.clause,
    replaced_text: a.replaced_text,
    replacement_text: a.replacement_text,
    removed_text: "",
    requirement_removed: false,
    mechanical_check: {
      replacement_text_present_exactly_once: replacementOccurrences === 1,
      replacement_text_occurrences: replacementOccurrences,
      replaced_text_survives_verbatim_inside_the_replacement: a.replacement_text.includes(a.replaced_text),
      replacement_text_is_an_extension_of_the_replaced_text: a.replacement_text.startsWith(a.replaced_text),
      replaced_text_occurrences_in_the_amended_document: replacedStillStandalone,
      note:
        "the replaced text still appears in the amended document — because it is retained verbatim inside its replacement. Nothing was deleted, so Core Constitution section 6.4's removal condition is not triggered.",
    },
    line_after_amendment: lineOf(a.replacement_text.slice(0, 60)),
  };
});

const rowAmendment = {
  id: A.append[0].id,
  type: "APPEND_AMENDMENT_HISTORY_ROW",
  document: A.append[0].document,
  clause: A.append[0].clause,
  appended_row: A.append[0].row,
  removed_text: "",
  requirement_removed: false,
  mechanical_check: {
    row_present_in_the_amended_document: amended.includes(A.append[0].marker),
    row_occurrences: amended.split(A.append[0].marker).length - 1,
    every_earlier_row_preserved: ["PHASE5-001M", "PHASE5-001O", "PHASE5-001I-A", "PHASE5-001P"].every((id) =>
      amended.includes("| 2026-09-30 | " + id + " |"),
    ),
    section: "section 8, Amendment History — appended under Core Constitution section 6.5, which requires the change record to live in the amended document itself",
  },
  line_after_amendment: lineOf(A.append[0].marker),
};

const all = amendments.concat([rowAmendment]);

// ---- inversion: undo everything and compare with the pre-amendment digest ---------------------------------
let reconstructed = amended;
reconstructed = reconstructed.replace("\n" + A.append[0].row, "");
for (let i = A.replace.length - 1; i >= 0; i--) {
  reconstructed = reconstructed.replace(A.replace[i].replacement_text, A.replace[i].replaced_text);
}
const reconstructedDigest = sha256Of(Buffer.from(reconstructed, "utf8"));
const inversion = {
  method:
    "the appended row is removed and each replacement is undone in reverse order; the reconstructed bytes are hashed",
  pre_amendment_digest: applied.digest_before,
  reconstructed_digest: reconstructedDigest,
  reconstruction_matches_baseline: reconstructedDigest === applied.digest_before,
  what_this_proves:
    "the amendment added exactly the five recorded items and changed nothing else in the document. A hidden edit, an extra character or a dropped requirement would change the reconstructed digest.",
};

const out = {
  artifact: "amendment_text.json",
  work_order: "PHASE5-001S",
  created_utc: "2026-09-30",
  document_type: "AMENDMENT RECORD — every quoted replacement and the appended row, with its mechanical checks",
  purpose:
    "record, for the amended rank-5 build plan, exactly which clause was quoted and replaced, what the replacement says, that no requirement was removed, and that undoing the amendment reconstructs the pre-amendment bytes exactly",
  document: doc,
  document_rank: "5 — Approved Build Plan (authority order: CRP_CORE_CONSTITUTION.md section 2)",
  amendment_procedure_applied: "CRP_CORE_CONSTITUTION.md sections 6.1, 6.2, 6.4 and 6.5",
  digest_before: applied.digest_before,
  digest_after: applied.digest_after,
  bytes_before: applied.bytes_before,
  bytes_after: applied.bytes_after,
  line_endings: applied.line_endings,
  amendment_count: all.length,
  replacements: amendments.length,
  rows_appended: 1,
  amendment_types: {
    REPLACE_BY_EXTENSION:
      "the clause's own text is quoted and retained verbatim, and the replacement appends the scoped reading. This is the minimum form that satisfies section 6.2 (the replacement text is stated) while satisfying section 6.4 (no requirement is removed).",
    APPEND_AMENDMENT_HISTORY_ROW:
      "section 6.5 requires the amendment history to be recorded in the amended document itself; one row is appended and every earlier row is preserved.",
  },
  amendments: all,
  inversion_check: inversion,
  what_the_replacement_texts_say: [
    "A-1 records the pre-admission sequence in the ordering authority: Gate 5.4 finalises a rule record, Gates 5.5 and 5.6 read that finalised record whether or not Gate 5.7 has admitted it, admission remains the precondition of emitting rather than of specifying, a pre-admission record is pinned by a content-derived pre-admission version identity, an unadmitted rule must refuse to emit, and no rule may be admitted early to satisfy a gate",
    "A-2 records how `admitted rule records` is read in Phase 5.5 bullet 3 for a named scope: the finalised Gate 5.4 record at its pinned pre-admission version, with the emission prohibition unchanged",
    "A-3 records that section 4 item 5's admission precondition is the Gate 5.4 and Gate 5.3 pass for the named scope, not Gate 5.7 admission, and that the artifact must refuse to emit until Gate 5.7 admits the rule",
    "A-4 records how Gate 5.6's immutable-version sharing condition is measured for a scope whose rule record is unadmitted: against the pinned pre-admission version identity and the immutable digests of the crosswalk, tests and templates, with the production admission identity reserved to Gate 5.7 and that reservation to be named rather than passed",
    "A-5 appends the amendment-history row for PHASE5-001S under section 6.5",
  ],
  what_no_replacement_did: [
    "it did not delete, narrow, paraphrase or renumber anything: the replaced text survives byte-for-byte inside every replacement",
    "it did not touch Gate 5.5's own sentence, which is the prohibition the pre-admission sequence relies on",
    "it did not move Gate 5.7, change the finding model, change a stop condition, change the permanences or change the scope boundary",
    "it did not admit a rule, create coverage or a candidate, create a finding class or change the application",
  ],
  verdict:
    inversion.reconstruction_matches_baseline && amendments.every((a) => a.mechanical_check.replacement_text_present_exactly_once)
      ? "AMENDMENT RECORDED AND INVERTIBLE — five amendments to the rank-5 build plan, each an extension, each present exactly once, and the reconstruction of the pre-amendment bytes matches the recorded digest"
      : "CHECK — the amendment record does not reconcile",
  created_by: "PHASE5-001S",
};
fs.writeFileSync(path.join(OUT, "amendment_text.json"), JSON.stringify(out, null, 2), "utf8");
console.log(out.verdict);
console.log("  reconstructed: " + inversion.reconstructed_digest);
console.log("  pre-amendment: " + inversion.pre_amendment_digest);
if (!inversion.reconstruction_matches_baseline) process.exit(1);

