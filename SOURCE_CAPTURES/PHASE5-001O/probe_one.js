const B = require("./build_001o_coverage_ledger.js");
const ids = process.argv.slice(2);
for (const id of ids) {
  const e = B.entries.find((x) => x.source_entry_id === id);
  if (!e) {
    console.log(id, "not found");
    continue;
  }
  const j = B.legacyJoin(e);
  console.log("=====", id, JSON.stringify({ art: e.source_artifact, prov: e.provision_or_citation, jr: e.legacy_jurisdiction_reference, ctry: e.canonical_country_code, region: e.canonical_region_code, status: e.canonical_jurisdiction_status, instrument: e.instrument_title }, null, 1));
  console.log("  basis:", j.basis, "refs:", j.refs.length, JSON.stringify(j.refs.slice(0, 2)));
  const pool = (B.legacy.solRows[e.source_artifact] || []).concat(B.legacy.legalRuleRows[e.source_artifact] || []);
  const cores = (String(e.provision_or_citation).match(/[0-9][0-9A-Za-z.\-]*(?::[0-9A-Za-z.\-]+)?(?:\([0-9a-z]+\))*/g) || []).filter((t) => t.length >= 3).sort((a, b) => b.length - a.length);
  console.log("  cores:", JSON.stringify(cores));
  for (const t of cores.slice(0, 3)) {
    const m = pool.filter((r) => r.section && r.section.includes(t));
    console.log("   core", t, "section-matches:", m.length, m.slice(0, 4).map((r) => r.jurisdiction + " :: " + String(r.section).slice(0, 70)));
  }
}
