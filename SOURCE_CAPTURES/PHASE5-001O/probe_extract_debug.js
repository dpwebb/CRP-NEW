/**
 * probe_extract_debug.js — why coverage.* and legalRules.ts extract short.
 */
const L = require("./lib_001o.js");
const path = require("path");

for (const rel of ["packages\\backend\\src\\services\\legalCorpus\\coverage.ca.ts", "packages\\backend\\src\\services\\legalRules.ts", "packages\\backend\\src\\services\\solTable.ts"]) {
  const text = L.read(path.join(L.LEG, rel));
  const regions = L.blockRegions(text);
  console.log("=====", rel);
  console.log("  blocks:", Object.keys(regions).join(", "));
  for (const [name, region] of Object.entries(regions)) {
    const objs = L.objectLiterals(region).filter((o) => /(?:^|[\s{,])provision\s*:/.test(o.raw));
    const secs = L.objectLiterals(region).filter((o) => /(?:^|[\s{,])section\s*:/.test(o.raw));
    const calls = (region.match(/\b(cov|res)\s*\(/g) || []).length;
    if (objs.length || secs.length || calls) console.log("   ", name.padEnd(28), "len=" + String(region.length).padStart(7), "cov/resCalls=" + calls, "provisionObjs=" + objs.length, "sectionObjs=" + secs.length);
  }
}
