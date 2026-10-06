/**
 * revert_001p_amendments.js — reverses PHASE5-001P's amendment set exactly, so that the set can be re-applied
 * in a corrected form without leaving an unexplained intermediate state.
 *
 * It was used once during this order: the amendment set was first applied without a paragraph break in
 * amendment A-1, and a second unguarded application duplicated the additive edits. This utility removes the
 * ADDED text — the A-1 paragraph in either of its leading-newline forms, the A-2 and A-3 sentences in every
 * copy, and the appended amendment-history row — and it REFUSES to write unless the result reproduces the
 * baseline SHA-256 recorded in preserved_files_before.json. A wrong or partial reversal therefore cannot
 * silently destroy bytes: it aborts, records the attempt, and leaves the file as it found it.
 *
 * Usage: node revert_001p_amendments.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const A = require("./amendments_001p.js");

const ROOT = "C:\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001P");
const doc = A.replace[0].document;
const abs = path.join(ROOT, doc);
const sha256Of = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex").toUpperCase();

const before = JSON.parse(fs.readFileSync(path.join(OUT, "preserved_files_before.json"), "utf8"));
const baseline = before.files.find((f) => f.relative_path === doc).sha256;

let text = fs.readFileSync(abs, "utf8");
const original = text;
const removals = {};

// 1. the appended amendment-history row
const row = text.split("\n").find((l) => l.startsWith(A.append[0].marker));
if (row) {
  text = text.replace(row + "\n", "");
  removals.appended_history_row = 1;
}

// 2. the A-1 paragraph, in every copy and in either leading-newline form
const body = A.SCOPED_PROGRESSION_PARAGRAPH.slice(A.SCOPED_PROGRESSION_PARAGRAPH.indexOf("**Owner"));
for (const lead of ["\n\n", "\n"]) {
  let n = 0;
  while (text.includes(lead + body)) {
    text = text.split(lead + body).join("");
    n++;
  }
  if (n) removals["A-1_paragraph_leading_" + JSON.stringify(lead)] = n;
}

// 3. the A-2 and A-3 appended sentences, in every copy
for (const a of A.replace) {
  if (a.id === "A-1") continue;
  const sentence = a.replacement_text.slice(a.replaced_text.length);
  let n = 0;
  while (text.includes(sentence)) {
    text = text.split(sentence).join("");
    n++;
  }
  removals[a.id + "_appended_sentence"] = n;
}

const digest = sha256Of(text);
const record = {
  artifact: "revert_001p_amendments_result.json",
  work_order: "PHASE5-001P",
  purpose:
    "record the exact reversal that restored the amended document to its recorded baseline digest, so the intermediate state is measured rather than asserted",
  document: doc,
  removals_taken: removals,
  digest_before_revert: sha256Of(original),
  digest_after_revert: digest,
  baseline_digest: baseline,
  reversal_reproduced_baseline: digest === baseline,
  bytes_written: digest === baseline,
  why_this_utility_exists:
    "the amendment set was corrected once during this order: the first application omitted a paragraph break in amendment A-1, and a second unguarded application duplicated the additive edits. The set was reversed exactly to the baseline digest recorded before any amendment and then re-applied in its recorded final form. This order records that intermediate state instead of hiding it.",
  created_by: "PHASE5-001P",
};
fs.writeFileSync(path.join(OUT, "revert_001p_amendments_result.json"), JSON.stringify(record, null, 2), "utf8");

if (digest !== baseline) {
  console.log("ABORT: reversal does not reproduce the baseline digest (" + digest + " != " + baseline + "); file untouched");
  process.exit(3);
}
fs.writeFileSync(abs, text, "utf8");
console.log("REVERTED to the recorded baseline digest " + baseline + " | removals: " + JSON.stringify(removals));

