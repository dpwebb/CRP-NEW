/**
 * probe_unjoined.js — summarise the catalogue entries with no recorded-basis legacy join.
 */
const B = require("./build_001o_coverage_ledger.js");

const summary = {};
const examples = {};
for (const e of B.entries) {
  const j = B.legacyJoin(e);
  if (j.refs.length > 0) continue;
  const key = e.source_artifact.split("\\").pop() + " | " + e.record_type + " | " + (e.legacy_jurisdiction_reference || "").slice(0, 24);
  summary[key] = (summary[key] || 0) + 1;
  examples[key] = examples[key] || [];
  if (examples[key].length < 2) examples[key].push(e.source_entry_id + ": " + String(e.provision_or_citation).slice(0, 90));
}
console.log("unjoined groups:");
for (const [k, v] of Object.entries(summary).sort((a, b) => b[1] - a[1])) {
  console.log(String(v).padStart(4), k);
  for (const ex of examples[k]) console.log("        ", ex);
}

const blocks = {};
for (const r of B.legacy.legalRuleRows["packages\\backend\\src\\services\\legalRules.ts"] || []) {
  const k = r.block + (r.key ? ":" + r.key : "");
  blocks[k] = (blocks[k] || 0) + 1;
}
console.log("\nlegalRules.ts rows by block/key:", JSON.stringify(blocks, null, 1));
