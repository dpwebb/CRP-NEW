/**
 * probe_join.js — measure the PHASE5-001O legacy-join rate before the ledger is written.
 */
const B = require("./build_001o_coverage_ledger.js");

const stats = {};
const byArtifact = {};
let joined = 0;
for (const e of B.entries) {
  const j = B.legacyJoin(e);
  stats[j.basis] = (stats[j.basis] || 0) + 1;
  byArtifact[e.source_artifact] = byArtifact[e.source_artifact] || {};
  byArtifact[e.source_artifact][j.basis] = (byArtifact[e.source_artifact][j.basis] || 0) + 1;
  if (j.refs.length > 0) joined += 1;
}
console.log("entries:", B.entries.length, " joined:", joined, " unjoined:", B.entries.length - joined);
console.log("basis distribution:", JSON.stringify(stats, null, 1));
console.log("\nper artifact:");
for (const [a, m] of Object.entries(byArtifact)) {
  console.log("  ", a);
  for (const [k, v] of Object.entries(m)) console.log("      ", k, v);
}

console.log("\nlegacy extraction sizes:");
console.log("  coverage files:", Object.keys(B.legacy.coverage).length, "entries:", Object.values(B.legacy.coverage).reduce((a, b) => a + b.length, 0));
console.log("  rule rows:", Object.entries(B.legacy.ruleRows).map(([k, v]) => `${k.replace("packages\\backend\\src\\services\\legalCorpus\\", "")}=${v.length}`).join(" "));
console.log("  legal rule rows:", Object.entries(B.legacy.legalRuleRows).map(([k, v]) => `${k}=${v.length}`).join(" "));
console.log("  sol rows:", Object.entries(B.legacy.solRows).map(([k, v]) => `${k}=${v.length}`).join(" "));
console.log("  authority rows:", Object.entries(B.legacy.authorityRows).map(([k, v]) => `${k.replace("packages\\backend\\src\\services\\legalCorpus\\", "")}=${v.length}`).join(" "));
console.log("  citation registry rows:", B.legacy.citationRegistry ? B.legacy.citationRegistry.rows.length : 0);

console.log("\nsample legacy rule row:", JSON.stringify((B.legacy.ruleRows["packages\\backend\\src\\services\\legalCorpus\\rules.ca.ts"] || [])[0], null, 1));
console.log("\nsample legacy canada rule row:", JSON.stringify((B.legacy.ruleRows["packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts"] || [])[0], null, 1));
console.log("\nsample sol row:", JSON.stringify((B.legacy.solRows["packages\\backend\\src\\services\\solTable.ts"] || [])[0], null, 1));
console.log("\nsample legal rule row:", JSON.stringify((B.legacy.legalRuleRows["packages\\backend\\src\\services\\legalRules.ts"] || [])[0], null, 1));
console.log("\nsample register row:", JSON.stringify(B.register["CRP-LSRC-0079"], null, 1));
console.log("\nregister row (an un-durably-based row):", JSON.stringify(B.register["CRP-LSRC-0110"], null, 1));
