'use strict';
/* OWNER-CA-ORDINARY-REPORT-001 — one bounded builder: adds the Ontario ordinary-report reliability rule to the
   runtime adapter configuration and mirrors it in the catalog, keeping the two files consistent (a shared
   regression asserts catalog.implemented_adapters deep-equals config.adapters, and that the catalog records the
   config digest). Idempotent: running it twice changes nothing. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DIR = path.resolve(__dirname, '..', '..', 'accelerated-launch', 'adapters');
const CONFIG = path.join(DIR, 'adapter-configs.json');
const CATALOG = path.join(DIR, 'rule-adapter-catalog.json');

const ENTRY = {
  adapter_id: 'CA-ON-CRA-S9-3-A-RELIABLE-EVIDENCE-BASIS',
  legacy_rule_id: 'ca-on.cra.s9_3_a.best_evidence_basis',
  source_entry_id: 'CRP-LSRC-0362',
  ledger_row_ids: ['CRP-LSRC-0362'],
  citation: 'Consumer Reporting Act (Ontario), R.S.O. 1990, c. C.33, s. 9(3)(a)',
  limb: "RECORDED PROVISION (located 2026-10-04): Consumer Reporting Act (Ontario), R.S.O. 1990, c. C.33, s. 9(3)(a) — 'any credit information based on evidence that is not the best evidence reasonably available' (within '9(3) A consumer reporting agency shall not include in a consumer report,'; s. 9 is 'Procedures of agencies', s. 9(2) 'Information included in consumer report', s. 9(3) 'Idem'). Applicable edition: the consolidation in force (consolidation period from July 1, 2026 to the e-Laws currency date; last amendment 2025, c. 24, Sched. 6, which amends s. 12(3) and not s. 9). Source identity: Government of Ontario, e-Laws. Paragraph (a)'s wording is located from a published rendering corroborated by the authoritative consolidated index and by this row's admitted legacy atomic rule `ca-on.cra.s9_3_a.best_evidence_basis`; the authoritative full-page render was unavailable in this environment and that limitation is retained. Full record: SOURCE_CAPTURES/CA-ON-ORDINARY-REPORT/crp-lsrc-0362-provision-retrieval.json. Temporal applicability is a condition of attribution and is NOT the same as retention arithmetic: this rule performs no retention arithmetic, and it claims no commencement date.",
  anchor_mode: 'CONTENT_RELIABILITY',
  opened_field: 'liability.openedDate',
  closed_field: 'liability.closedDate',
  period_years: 0,
  record_kinds: ['CONSUMER_CREDIT_LIABILITY'],
  applicability_rule: 'ORDINARY_ACCOUNT_BOTH_DATES_PRESENT',
  applicability: { mode: 'EXACT', country: 'CA', region: 'CA-ON' },
  presentation_required: 'GENERAL-BUREAU-REPORT',
  presentation_required_added_by: 'OWNER-CA-ORDINARY-REPORT-001 (2026-10-04): the ordinary-account opened/closed structure is carried by the general bureau-report intake. No PR-01 widening (nothing establishes that the PR-01 reader produces both printed readings) and no new bureau-family admission.',
  output_permission: { max_conclusion: 'probable_violation', finding_allowed: true, packet_eligible: false },
  exceptions: {
    recorded: false,
    basis: "The located provision states no exception. Whether the printed values came from the best evidence reasonably available is not resolvable from the report itself, so no exception is evaluated here and the conclusion ceiling stays PROBABLE_VIOLATION. Off-report knowledge — the furnisher's own records — is never inferred.",
    items: []
  },
  finding_gate: "ENABLED (2026-10-04): legal applicability and the evidence gate pass. CRP-LSRC-0362 is an EXACT CA-ON row, owner-accepted, instrument class STATUTE_OR_REGULATION with no confirmation required, and its legacy atomic rule ca-on.cra.s9_3_a.best_evidence_basis is an EXACT recorded mapping with the operational mapping ESTABLISHED. Its recorded basis is the provision's own located wording (not the legacy rule id and not an earlier gloss), with the applicable edition, source identity and retrieval limitation recorded in SOURCE_CAPTURES/CA-ON-ORDINARY-REPORT/crp-lsrc-0362-provision-retrieval.json. The maximum conclusion is probable_violation, never violation: the report establishes that its own two printed values cannot both be right, and nothing in the report establishes which of them is unreliable or whether a benign explanation applies. The same printed conflict reaches the consumer as ONE issue carrying both supported bases (the factual conflict and this recorded rule) with one verification request; the internal classifications stay separate inside that issue. packet_eligible stays false; a PROBABLE content finding is packet-eligible by confidence, not by a widened per-rule permission.",
  source_version: '90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF',
  source_artifact: 'packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts'
};

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));

const already = config.adapters.findIndex((a) => a.adapter_id === ENTRY.adapter_id);
if (already >= 0) {
  config.adapters[already] = ENTRY;
} else {
  const at = config.adapters.findIndex((a) => a.adapter_id === 'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE');
  config.adapters.splice(at >= 0 ? at + 1 : config.adapters.length, 0, ENTRY);
}
fs.writeFileSync(CONFIG, `${JSON.stringify(config, null, 2)}\n`);

/* The catalog mirrors the configuration exactly: the same records, in the same order. */
const fresh = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
catalog.implemented_adapters = fresh.adapters;
catalog.inputs.adapter_configs = sha256(CONFIG);
const region = (catalog.regions || []).find((r) => r.region === 'CA-ON');
if (region) {
  const tagged = `${ENTRY.adapter_id}@EXACT_MATCH`;
  region.adapter_coverage = [...new Set([...(region.adapter_coverage || []), tagged])];
}
/* The buckets this catalog keeps for planning move with the change: CA-ON leaves the no-adapter bucket. */
if (catalog.next_concrete_batches && catalog.next_concrete_batches.B2_exact_region_candidates_without_an_adapter) {
  const b2 = catalog.next_concrete_batches.B2_exact_region_candidates_without_an_adapter;
  b2.records = (b2.records || []).filter((r) => !(r.regions || []).includes('CA-ON'));
  b2.regions = (b2.regions || []).filter((r) => r !== 'CA-ON');
  b2.count = Array.isArray(b2.regions) ? b2.regions.length : b2.count;
}
fs.writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`adapter configs: ${fresh.adapters.length} adapters; catalog mirror + digest updated (CA-ON coverage: ${JSON.stringify(region ? region.adapter_coverage : null)})`);
