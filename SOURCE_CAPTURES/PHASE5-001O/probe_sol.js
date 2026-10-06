const B = require("./build_001o_coverage_ledger.js");
const rows = B.legacy.solRows["packages\\backend\\src\\services\\solTable.ts"] || [];
const want = process.argv.slice(2);
for (const r of rows) {
  if (want.length === 0 || want.some((w) => String(r.jurisdiction).includes(w) || String(r.section).includes(w))) {
    console.log(JSON.stringify({ jurisdiction: r.jurisdiction, years: r.years, section: r.section, law: (r.law || "").slice(0, 40) }));
  }
}
console.log("total sol rows:", rows.length, " distinct jurisdiction tokens:", Array.from(new Set(rows.map((r) => r.jurisdiction))).join(","));
console.log("solRefused:", JSON.stringify(B.legacy.solRefused));
console.log("provinceInstruments:", JSON.stringify(B.legacy.provinceInstruments));
