/**
 * apply_001p_amendments.js — PHASE5-001P step 2: apply the three quoted replacements and the one appended
 * amendment-history row to the rank-5 Approved Build Plan, and write amendment_application_result.json.
 *
 * Guards, all of them measured rather than asserted:
 *  - every replacement's `replaced_text` must occur EXACTLY ONCE in the file; otherwise the run aborts
 *    without writing anything (a quoted-replacement amendment that cannot be located once is not applied);
 *  - the file's line endings and trailing-newline state are measured before and after, and LF must survive;
 *  - the before/after SHA-256 of the amended document is recorded;
 *  - the appended row must not already be present.
 *
 * It writes no other file, and it amends no document other than the one named by the amendments module.
 */
const fs = require("fs");
const path = require("path");
const A = require("./amendments_001p.js");

const ROOT = "C:\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001P");
const sha256 = (p) => require("crypto").createHash("sha256").update(fs.readFileSync(p)).digest("hex").toUpperCase();
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
  const alreadyApplied = a.replaced_text.length !== a.replacement_text.length && text.includes(a.replacement_text) && text.split(a.replacement_text).length - 1 >= 1;
  if (a.document !== doc) problems.push(a.id + ": unexpected target document");
  if (alreadyApplied) {
    problems.push(a.id + ": replacement text is already present — refusing to apply an amendment twice");
  } else if (occurrences !== 1) {
    problems.push(a.id + ": replaced text occurs " + occurrences + " time(s), expected exactly 1 — aborted");
  }
  results.push({
    id: a.id,
    clause: a.clause,
    action: problems.length === 0 ? "APPLIED" : "NOT_APPLIED",
    occurrences_found: occurrences,
    already_present_guard: alreadyApplied,
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
      // document's original trailing-newline run is preserved after it. Removing <row><LF> therefore
      // restores the pre-amendment bytes exactly, which the inversion check in the records build verifies.
      text = text.replace(/\n+$/, (m) => "\n" + a.row + m);
    }
  }

  fs.writeFileSync(abs, text, "utf8");
}

const textAfter = read(abs);
const digestAfter = sha256(abs);
const list = fs.readdirSync(OUT);

const out = {
  artifact: "amendment_application_result.json",
  work_order: "PHASE5-001P",
  created_utc: "2026-09-30",
  document: doc,
  document_rank: "5 — Approved Build Plan (authority order: CRP_CORE_CONSTITUTION.md section 2)",
  amendment_form: "quoted replacement, CRP_CORE_CONSTITUTION.md section 6.2 — document named, clause named, replaced text quoted, replacement text stated",
  digest_before: digestBefore,
  digest_after: digestAfter,
  bytes_before: bytesBefore,
  bytes_after: fs.statSync(abs).size,
  document_changed: digestBefore !== digestAfter,
  document_changed_in_this_run: digestBefore !== digestAfter,
  line_endings: crlfBefore === 0 && (textAfter.match(/\r\n/g) || []).length === 0 && textAfter.endsWith("\n") && endsWithNewlineBefore ? "LF preserved" : "CHECK — line endings or trailing newline changed",
  line_endings_measured: {
    crlf_before: crlfBefore,
    crlf_after: (textAfter.match(/\r\n/g) || []).length,
    ends_with_newline_before: endsWithNewlineBefore,
    ends_with_newline_after: textAfter.endsWith("\n"),
  },
  amendments_applied: results.length,
  document_state:
    "OWNER_AUTHORITY_PHASE5_001P_RECORDED_IN_THE_DOCUMENT — scoped gate verdicts and incremental rule-unit progression added to the ordering sentence, Gate 5.2 recorded as corpus-wide and unaffected by a scoped verdict, Phase 5.3 bullet 1 given its scoped reading, and the amendment-history row appended under section 6.5",
  results,
  problems,
  verdict:
    problems.length === 0
      ? "AMENDMENTS APPLIED — the scoped-progression authority is recorded by the amendment procedure, no corpus-wide gate is passed, and no other clause was touched"
      : "AMENDMENTS NOT APPLIED — problems recorded above",
  created_by: "PHASE5-001P",
};
fs.writeFileSync(path.join(OUT, "amendment_application_result.json"), JSON.stringify(out, null, 2), "utf8");
console.log(out.verdict);
for (const p of problems) console.log("  PROBLEM:", p);
