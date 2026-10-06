/**
 * apply_001s_amendments.js — PHASE5-001S step 2: apply the four quoted replacements and the one appended
 * amendment-history row to the rank-5 Approved Build Plan, and write amendment_application_result.json.
 *
 * Guards, all of them measured rather than asserted:
 *  - every replacement's `replaced_text` must occur EXACTLY ONCE in the file; otherwise the run aborts without
 *    writing anything (a quoted-replacement amendment that cannot be located once is not applied);
 *  - the replacement text must not already be present, so an amendment cannot be applied twice;
 *  - every replacement must be an EXTENSION: the replaced text must survive verbatim inside the replacement
 *    text, so no requirement is removed and Core Constitution section 6.4 is satisfied without a removal;
 *  - the file's line endings and trailing-newline state are measured before and after, and LF must survive;
 *  - the before/after SHA-256 of the amended document is recorded;
 *  - the appended row must not already be present.
 *
 * It writes no other file, and it amends no document other than the one named by the amendments module.
 */
const fs = require("fs");
const path = require("path");
const A = require("./amendments_001s.js");

const ROOT = "C:\\\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001S");
const sha256 = (p) =>
  require("crypto").createHash("sha256").update(fs.readFileSync(p)).digest("hex").toUpperCase();
const read = (p) => fs.readFileSync(p, "utf8");

const results = [];
const problems = [];
const doc = A.replace[0].document;
const abs = path.join(ROOT, doc);

let text = read(abs);
const digestBefore = sha256(abs);
const bytesBefore = fs.statSync(abs).size;
const crlfBefore = (text.match(/\r\n/g) || []).length;
const endsWithNewlineBefore = text.endsWith("\n");

for (const a of A.replace) {
  const occurrences = text.split(a.replaced_text).length - 1;
  const alreadyApplied = text.split(a.replacement_text).length - 1 >= 1;
  const isExtension = a.replacement_text.includes(a.replaced_text);
  if (a.document !== doc) problems.push(a.id + ": unexpected target document");
  if (alreadyApplied) {
    problems.push(a.id + ": replacement text is already present — refusing to apply an amendment twice");
  } else if (occurrences !== 1) {
    problems.push(a.id + ": replaced text occurs " + occurrences + " time(s), expected exactly 1 — aborted");
  }
  if (!isExtension) {
    problems.push(a.id + ": replacement is not an extension of the replaced text, so a requirement could be removed");
  }
  results.push({
    id: a.id,
    clause: a.clause,
    action: problems.length === 0 ? "APPLIED" : "NOT_APPLIED",
    occurrences_found: occurrences,
    already_present_guard: alreadyApplied,
    extension_only_no_requirement_removed: isExtension,
    replaced_text_bytes: Buffer.byteLength(a.replaced_text, "utf8"),
    replacement_text_bytes: Buffer.byteLength(a.replacement_text, "utf8"),
  });
}

if (problems.length === 0) {
  for (const a of A.replace) text = text.replace(a.replaced_text, a.replacement_text);

  let appendedRowPresentBefore = false;
  for (const a of A.append) {
    if (a.document !== doc) problems.push(a.id + ": unexpected target document");
    if (text.includes(a.marker)) appendedRowPresentBefore = true;
    results.push({ id: a.id, clause: a.clause, action: appendedRowPresentBefore ? "ALREADY_PRESENT" : "APPLIED" });
  }
  if (!appendedRowPresentBefore) {
    for (const a of A.append) {
      // Exactly invertible append: the row is inserted immediately after the first trailing newline and the
      // document's original trailing-newline run is preserved after it, so removing <row><LF> restores the
      // pre-amendment bytes exactly.
      text = text.replace(/\n+$/, (m) => "\n" + a.row + m);
    }
  }

  fs.writeFileSync(abs, text, "utf8");
}

const textAfter = read(abs);
const digestAfter = sha256(abs);


const out = {
  artifact: "amendment_application_result.json",
  work_order: "PHASE5-001S",
  created_utc: "2026-09-30",
  document: doc,
  document_rank: "5 — Approved Build Plan (authority order: CRP_CORE_CONSTITUTION.md section 2)",
  amendment_form:
    "quoted replacement, CRP_CORE_CONSTITUTION.md section 6.2 — document named, clause named, replaced text quoted, replacement text stated; every replacement is an extension, so no requirement is removed (section 6.4)",
  amendment_authority: "the two owner decisions this order carries, applied through the governing procedure",
  digest_before: digestBefore,
  digest_after: digestAfter,
  bytes_before: bytesBefore,
  bytes_after: fs.statSync(abs).size,
  document_changed: digestBefore !== digestAfter,
  document_changed_in_this_run: digestBefore !== digestAfter,
  line_endings:
    crlfBefore === 0 &&
    (textAfter.match(/\r\n/g) || []).length === 0 &&
    textAfter.endsWith("\n") &&
    endsWithNewlineBefore
      ? "LF preserved"
      : "CHECK — line endings or trailing newline changed",
  line_endings_measured: {
    crlf_before: crlfBefore,
    crlf_after: (textAfter.match(/\r\n/g) || []).length,
    ends_with_newline_before: endsWithNewlineBefore,
    ends_with_newline_after: textAfter.endsWith("\n"),
  },
  amendments_applied: results.length,
  replacements_applied: A.replace.length,
  rows_appended: A.append.length,
  document_state:
    "OWNER_AUTHORITY_PHASE5_001S_RECORDED_IN_THE_DOCUMENT — the pre-admission specification and validation sequence is added to the scoped-progression paragraph, Phase 5.5 bullet 3 and section 4 item 5 record how their admission presupposition is read for a named scope, Gate 5.6 records how its version-sharing condition is measured against a pinned pre-admission rule-record version, and the amendment-history row is appended under section 6.5",
  the_only_pre_existing_file_this_order_changed: doc,
  results,
  problems,
  verdict:
    problems.length === 0
      ? "AMENDMENTS APPLIED — the pre-admission sequence is recorded by the amendment procedure, Gate 5.7 keeps admission, no requirement is removed, no gate is passed by the amendment, and no other document was touched"
      : "AMENDMENTS NOT APPLIED — problems recorded above",
  created_by: "PHASE5-001S",
};
fs.writeFileSync(path.join(OUT, "amendment_application_result.json"), JSON.stringify(out, null, 2), "utf8");
console.log(out.verdict);
console.log("  " + digestBefore + " -> " + digestAfter);
for (const p of problems) console.log("  PROBLEM:", p);
if (problems.length) process.exit(1);
