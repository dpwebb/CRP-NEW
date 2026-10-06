/**
 * probe_legacy_corpus.js — PHASE5-001O reconnaissance probe (read-only).
 *
 * Purpose: establish, from the located legacy legal corpus at C:\Users\webbd\crp-credit-app and the
 * catalogue of record in this workspace, what is mechanically extractable for the PHASE5-001O
 * source-ID coverage ledger. It writes nothing outside this directory.
 */
const fs = require("fs");
const path = require("path");

const LEG = "C:\\Users\\webbd\\crp-credit-app";
const LC = path.join(LEG, "packages", "backend", "src", "services", "legalCorpus");
const ROOT = "C:\\CRP-NEW";

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function fencedJsonAfter(text, heading) {
  const h = text.indexOf(heading);
  if (h < 0) throw new Error("heading not found: " + heading);
  const start = text.indexOf("```json", h);
  const bodyStart = text.indexOf("\n", start) + 1;
  const end = text.indexOf("```", bodyStart);
  return text.slice(bodyStart, end);
}

const catalogueText = read(path.join(ROOT, "CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md"));
const entries = JSON.parse(fencedJsonAfter(catalogueText, "## 4. Global Source Entries"));
console.log("catalogue entries:", entries.length);

const byArtifact = {};
const byType = {};
for (const e of entries) {
  byArtifact[e.source_artifact] = (byArtifact[e.source_artifact] || 0) + 1;
  byType[e.record_type] = (byType[e.record_type] || 0) + 1;
}
console.log("by record_type:", JSON.stringify(byType, null, 1));
console.log("by source_artifact (count):");
for (const [k, v] of Object.entries(byArtifact).sort((a, b) => b[1] - a[1])) {
  console.log("   ", v, k);
}

// Sample provision_or_citation values per artifact (first three each).
const samples = {};
for (const e of entries) {
  samples[e.source_artifact] = samples[e.source_artifact] || [];
  if (samples[e.source_artifact].length < 3) samples[e.source_artifact].push(e.provision_or_citation.slice(0, 160));
}
console.log("\nsample provision_or_citation per artifact:");
for (const [k, v] of Object.entries(samples)) {
  console.log("*", k.replace("packages\\backend\\src\\services\\", "").replace("packages\\shared\\src\\", ""));
  for (const s of v) console.log("     -", s);
}

// Legacy corpus mechanical shape.
console.log("\nlegacy legalCorpus files:");
for (const f of fs.readdirSync(LC).sort()) {
  const t = read(path.join(LC, f));
  const c = (re) => (t.match(re) || []).length;
  console.log(
    "  ",
    f.padEnd(22),
    "bytes=" + String(t.length).padStart(7),
    "ruleId:=" + String(c(/ruleId:/g)).padStart(4),
    "citation:=" + String(c(/citation:/g)).padStart(4),
    "onRule(=" + String(c(/onRule\(/g)).padStart(4),
    "cov(=" + String(c(/\bcov\(/g)).padStart(4),
    "provision:=" + String(c(/provision:/g)).padStart(4),
    "outcome:=" + String(c(/outcome:/g)).padStart(4),
  );
}

// One sample onRule object from rules.ny.ts and one cov() from coverage.ny.ts.
function firstSlice(text, needle, len) {
  const i = text.indexOf(needle);
  return i < 0 ? "(not found)" : text.slice(i, i + len);
}
const ny = read(path.join(LC, "rules.ny.ts"));
console.log("\n--- rules.ny.ts first onRule( slice ---");
console.log(firstSlice(ny, "onRule({", 1200));
const covNy = read(path.join(LC, "coverage.ny.ts"));
console.log("\n--- coverage.ny.ts first cov( slice ---");
console.log(firstSlice(covNy, "cov(", 700));
const covCa = read(path.join(LC, "coverage.canada.ts"));
console.log("\n--- coverage.canada.ts first entry-ish slice ---");
console.log(firstSlice(covCa, "export const CANADA_COVERAGE", 1200));
const rulesCa = read(path.join(LC, "rules.canada.ts"));
console.log("\n--- rules.canada.ts first onRule( slice ---");
console.log(firstSlice(rulesCa, "onRule({", 900));
console.log("\n--- rules.canada.ts CANADA_ATOMIC_RULES slice ---");
console.log(firstSlice(rulesCa, "CANADA_ATOMIC_RULES", 400));
