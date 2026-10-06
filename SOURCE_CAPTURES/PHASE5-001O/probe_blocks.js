/**
 * probe_blocks.js — region sizes and record counts per declared block in legalRules.ts / solTable.ts.
 */
const L = require("./lib_001o.js");
const path = require("path");

for (const rel of ["packages\\backend\\src\\services\\legalRules.ts", "packages\\backend\\src\\services\\solTable.ts", "packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts"]) {
  const text = L.read(path.join(L.LEG, rel));
  const regions = L.blockRegions(text);
  console.log("=====", rel, " file len", text.length, " blocks:", Object.keys(regions).length);
  for (const [name, region] of Object.entries(regions)) {
    const sections = (region.match(/section:/g) || []).length;
    const ids = (region.match(/\bid:/g) || []).length;
    const declared = (text.match(new RegExp("const\\s+" + name + "\\b", "g")) || []).length;
    if (sections > 0 || ids > 0)
      console.log("   ", name.padEnd(26), "declared=" + declared, "regionLen=" + String(region.length).padStart(7), "section:=" + String(sections).padStart(4), "id:=" + String(ids).padStart(4), "objsWithSection=" + L.objectLiterals(region).filter((o) => /(?:^|[\s{,])section\s*:/.test(o.raw)).length);
  }
  const totalSections = (text.match(/section:/g) || []).length;
  console.log("   file-wide section: occurrences:", totalSections);
}
