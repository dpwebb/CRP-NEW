/**
 * probe_decl.js — how the remaining rule-set blocks are declared, and why coverage extraction is short.
 */
const L = require("./lib_001o.js");
const path = require("path");

const lr = L.read(path.join(L.LEG, "packages\\backend\\src\\services\\legalRules.ts"));
console.log("=== legalRules.ts declaration lines ===");
lr.split(/\r?\n/).forEach((line, i) => {
  if (/\b(US_RULES|CA_RULES|UK_RULES|AU_RULES|PROVINCE_INSTRUMENTS|US_STATE_RULES|LEGAL_RULES)\b/.test(line) && /=/.test(line) && !/^\s*\/\//.test(line)) {
    console.log(String(i + 1).padStart(5), line.trim().slice(0, 150));
  }
});

const covText = L.read(path.join(L.LEG, "packages\\backend\\src\\services\\legalCorpus\\coverage.ca.ts"));
const regions = L.blockRegions(covText);
const region = regions.CALIFORNIA_COVERAGE;
const callRe = /\b(cov|res)\s*\(/g;
let c;
let n = 0;
while ((c = callRe.exec(region)) !== null && n < 3) {
  const parsed = L.callArgs(region, c.index + c[0].length - 1);
  console.log("\n--- call", n, "index", c.index, "args:", parsed ? parsed.args.length : "NULL");
  if (parsed) console.log(JSON.stringify(parsed.args.map((a) => a.trim().slice(0, 60))));
  n += 1;
}
const ex = L.extractLegacy({ "packages\\backend\\src\\services\\legalCorpus\\coverage.ca.ts": covText });
console.log("\nextractLegacy coverage keys:", Object.keys(ex.coverage), "entries:", Object.values(ex.coverage).reduce((a, b) => a + b.length, 0));
