/**
 * probe_legacy_rulesets.js — PHASE5-001O second reconnaissance probe (read-only).
 *
 * Establishes the record shape of the two legacy rule-set artifacts admitted only for named static
 * declaration blocks (legalRules.ts, solTable.ts) and the citation registry, so the coverage ledger can
 * attach a legacy rule reference only where an exact recorded basis exists.
 */
const fs = require("fs");
const path = require("path");

const LEG = "C:\\Users\\webbd\\crp-credit-app";
const ROOT = "C:\\CRP-NEW";

function read(p) {
  return fs.readFileSync(p, "utf8");
}
function fencedJsonAfter(text, heading) {
  const h = text.indexOf(heading);
  const start = text.indexOf("```json", h);
  const bodyStart = text.indexOf("\n", start) + 1;
  const end = text.indexOf("```", bodyStart);
  return text.slice(bodyStart, end);
}

const entries = JSON.parse(fencedJsonAfter(read(path.join(ROOT, "CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md")), "## 4. Global Source Entries"));

for (const artifact of ["packages\\backend\\src\\services\\legalRules.ts", "packages\\backend\\src\\services\\solTable.ts", "docs\\citation-objects.tsv"]) {
  console.log("==========", artifact);
  const mine = entries.filter((e) => e.source_artifact === artifact);
  console.log("catalogue entries:", mine.length);
  for (const e of mine.slice(0, 6)) {
    console.log("  ", e.source_entry_id, "|", e.record_type, "|", e.legal_family, "|", e.legacy_jurisdiction_reference, "|", JSON.stringify(e.provision_or_citation).slice(0, 120));
  }
}

const lr = read(path.join(LEG, "packages", "backend", "src", "services", "legalRules.ts"));
console.log("\n--- legalRules.ts: exported block names ---");
for (const m of lr.matchAll(/export const ([A-Z_0-9]+)([^=]*)=/g)) console.log("   ", m[1], "|", m[2].trim().slice(0, 80));
console.log("\n--- legalRules.ts: first record-ish slice after US_RULES ---");
const i = lr.indexOf("US_RULES");
console.log(lr.slice(i, i + 1400));

const st = read(path.join(LEG, "packages", "backend", "src", "services", "solTable.ts"));
console.log("\n--- solTable.ts: exported block names ---");
for (const m of st.matchAll(/export const ([A-Z_0-9]+)([^=]*)=/g)) console.log("   ", m[1], "|", m[2].trim().slice(0, 80));
console.log("\n--- solTable.ts: first slice after SOL_ROWS ---");
const j = st.indexOf("SOL_ROWS");
console.log(st.slice(j, j + 1400));

const tsv = read(path.join(LEG, "docs", "citation-objects.tsv")).split(/\r?\n/).filter(Boolean);
console.log("\n--- citation-objects.tsv: rows=" + (tsv.length - 1) + " ---");
console.log("header:", tsv[0]);
const verifiedCounts = { true: 0, false: 0 };
for (const line of tsv.slice(1)) {
  const cols = line.split("\t");
  verifiedCounts[cols[7]] = (verifiedCounts[cols[7]] || 0) + 1;
}
console.log("verified column:", JSON.stringify(verifiedCounts));
const instruments = new Set();
for (const line of tsv.slice(1)) instruments.add(line.split("\t")[3]);
console.log("distinct instruments:", instruments.size);
console.log("sample instruments:", Array.from(instruments).slice(0, 8).join(" | "));
