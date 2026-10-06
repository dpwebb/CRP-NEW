/**
 * build_001o_amendment_record.js — writes amendment_text.json for PHASE5-001O.
 *
 * It quotes every inserted block from the amended file itself between its own markers, quotes each
 * appended amendment-history row from the file, records the before/after file state, and mechanically
 * checks that each replacement's replacement text is present in the amended file while the text it
 * replaced is gone.
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib_001o.js");
const A = require("./amendments_001o.js");

const before = JSON.parse(L.read(path.join(L.OUT, "preserved_files_before.json")));
const beforeByPath = {};
for (const f of before.files) beforeByPath[f.relative_path] = f;

const records = [];
const problems = [];
const stateOf = (doc) => ({ bytes: L.bytes(path.join(L.ROOT, doc)), sha256: L.sha256(path.join(L.ROOT, doc)) });

const norm = (s) => String(s).replace(/\s+/g, " ").trim();

for (const a of A.replace) {
  const text = L.read(path.join(L.ROOT, a.document));
  const normalizedText = norm(text);
  const hasReplacement = normalizedText.includes(norm(a.replacement_text));
  const additive = norm(a.replacement_text).includes(norm(a.replaced_text));
  const stillHasReplaced = normalizedText.includes(norm(a.replaced_text)) && !additive;
  if (!hasReplacement) problems.push(a.id + ": replacement text not found in the amended file");
  if (stillHasReplaced) problems.push(a.id + ": replaced text is still present in the amended file");
  records.push({
    id: a.id,
    document: a.document,
    clause: a.clause,
    type: additive ? "REPLACE_AND_EXTEND_REQUIREMENT" : "REPLACE_REQUIREMENT",
    replaced_text: a.replaced_text,
    replaced_chars: a.replaced_text.length,
    replacement_text: a.replacement_text,
    replacement_chars: a.replacement_text.length,
    mechanical_check: {
      comparison_basis: "whitespace-normalised",
      replacement_text_present_in_amended_file: hasReplacement,
      replaced_text_still_present_in_amended_file: stillHasReplaced,
      replacement_extends_the_replaced_text: additive,
    },
    after_file: stateOf(a.document),
  });
}

for (const a of A.insertAfter) {
  const text = L.read(path.join(L.ROOT, a.document));
  const s = text.indexOf(a.start_marker);
  const e = a.end_marker ? text.indexOf(a.end_marker, s + 1) : -1;
  const block = s >= 0 && e > s ? text.slice(s, e).replace(/[\r\n]+$/, "") : null;
  if (!block) problems.push(a.id + ": inserted block could not be located between its markers");
  if (!text.includes(a.anchor_text)) problems.push(a.id + ": anchor text not found in the amended file");
  records.push({
    id: a.id,
    document: a.document,
    clause: a.clause,
    type: "INSERT_AFTER_ANCHOR",
    replaced_text: "",
    replaced_chars: 0,
    anchor_text: a.anchor_text,
    replacement_text: block,
    replacement_chars: block ? block.length : 0,
    mechanical_check: {
      inserted_block_located_between_markers: Boolean(block),
      anchor_text_present_in_amended_file: text.includes(a.anchor_text),
    },
    after_file: stateOf(a.document),
  });
}

for (const a of A.append) {
  const text = L.read(path.join(L.ROOT, a.document));
  const line = text.split(/\r?\n/).find((l) => l.startsWith(a.marker));
  if (!line) problems.push(a.id + ": appended amendment-history row not found");
  records.push({
    id: a.id,
    document: a.document,
    clause: a.clause,
    type: "APPEND_AMENDMENT_HISTORY",
    replaced_text: "",
    replaced_chars: 0,
    replacement_text: line || null,
    replacement_chars: line ? line.length : 0,
    mechanical_check: { appended_row_present: Boolean(line) },
    after_file: stateOf(a.document),
  });
}
module.exports = { records, problems, beforeByPath, stateOf };

const documents = Array.from(new Set(records.map((r) => r.document)));
const fileStateChange = documents.map((d) => {
  const b = beforeByPath[d];
  const after = stateOf(d);
  return {
    document: d,
    before: b ? { bytes: b.bytes, sha256: b.sha256 } : null,
    after,
    changed: b ? b.sha256 !== after.sha256 : null,
  };
});

const out = {
  artifact: "amendment_text.json",
  work_order: "PHASE5-001O",
  created_utc: "2026-09-30",
  purpose:
    "the exact replaced and replacement text of every amendment this order made to a governing document, with the before and after state of each amended file, so Core Constitution section 6.2 is satisfied on the record rather than in prose",
  authority: "CRP_CORE_CONSTITUTION.md sections 6.1 to 6.5",
  amendment_count: records.length,
  documents_amended: documents,
  file_state_change: fileStateChange,
  inversion_note:
    "Unlike PHASE5-001M this order did not hold byte-identical pre-amendment copies of the amended documents, so no inversion reconstruction is claimed. Instead every replacement is checked mechanically against the amended file: the replacement text must be present and the replaced text must be gone. Every inserted block is quoted from the amended file itself, between the two markers recorded here.",
  mechanical_check_result: { problems, clean: problems.length === 0 },
  amendments: records,
  boundaries: {
    documents_deliberately_not_amended: [
      "CRP_CORE_CONSTITUTION.md, CRP_LEGAL_INVARIANT.md, JURISDICTION_CONTRACT.md and CRP_JURISDICTION_ENUMERATION.md: no clause conflicts with the owner directive. Section 2.3's bar on applying a legacy rule or jurisdiction mapping outside its recorded scope permits exactly the recorded relationships the directive relies on, and nothing in the directive authorises an unrecorded relationship.",
      "CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md: it already records that its entries are authoritative for their recorded legal content; the acceptance state is recorded in the admission contract whose boundary it uses.",
      "CRP_PHASE5_NEXT_GATE_RECONCILIATION.md: a rank-6 analysis artifact. Its prerequisite rows P-4 and P-8 are read subject to the amended rank-4 and rank-5 text, which this order's narrative records; amending an analysis artifact is not required to change the governing meaning.",
    ],
    what_this_did_not_do: [
      "No rule, coverage, candidate, finding or certified count was created.",
      "No legal content in the catalogue or the legacy corpus was rewritten.",
      "No gate is passed by the amendments themselves.",
    ],
  },
  created_by: "PHASE5-001O",
};

fs.writeFileSync(path.join(L.OUT, "amendment_text.json"), JSON.stringify(out, null, 2), "utf8");
console.log("amendments recorded:", records.length, "| documents amended:", documents.length, "| mechanical problems:", problems.length);
for (const p of problems) console.log("  PROBLEM:", p);
