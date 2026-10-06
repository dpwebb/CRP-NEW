'use strict';
/* CRP_VERSION_1_FINISH_ORDER_001 — one bounded builder for the GB accuracy outcome.
 *
 * It does four things, idempotently:
 *   1. adds the GB UK GDPR accuracy/rectification adapter to adapter-configs.json (reusing the CONTENT_RELIABILITY
 *      anchor mode already implemented for the Ontario limb — no new rule machinery);
 *   2. records the instrument's own UK-wide extent as an explicit relation in applicability-records.json, one row
 *      per canonical GB region, and updates that file's counts, region lists and config digest;
 *   3. mirrors the adapter configuration into rule-adapter-catalog.json and records each GB region's adapter
 *      coverage in the same object form the other relation-based regions use;
 *   4. keeps the four GB availability rows in launch-matrix.json truthful (the classes the region can actually run;
 *      the fictional-fixture journey is never counted as real-evidence performance).
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DIR = path.resolve(__dirname, '..', '..', 'accelerated-launch', 'adapters');
const CONFIG = path.join(DIR, 'adapter-configs.json');
const RECORDS = path.join(DIR, 'applicability-records.json');
const CATALOG = path.join(DIR, 'rule-adapter-catalog.json');
const MATRIX = path.resolve(__dirname, '..', '..', 'accelerated-launch', 'launch-matrix.json');

const ADAPTER_ID = 'GB-UK-GDPR-ART5-1-D-ART16-ACCURACY';
const RELATION_ID = 'GB-UK-GDPR-ACCURACY-COUNTRY-WIDE';
const GB_REGIONS = ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS'];
const REGION_STATE = 'CONFIRMED_UK_WIDE_STATUTE_EXTENT';
const TERRITORIAL_BASIS = 'the official publisher prints the geographical-extent marker on the provisions themselves (Article 5 U.K. and Article 16 U.K., with CHAPTER II U.K. and CHAPTER III U.K.), publishes the instrument under the title "(United Kingdom General Data Protection Regulation)" and keeps it up to date with amendments made by UK legislation, so the provision applies throughout the United Kingdom and needs no nation-specific identification; the recorded limitation instruments for these regions differ between nations and are NOT used for this relation';

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const ENTRY = {
  adapter_id: ADAPTER_ID,
  legacy_rule_id: 'uk.accuracy_duty.gdpr5',
  source_entry_id: 'CRP-LSRC-0407',
  ledger_row_ids: ['CRP-LSRC-0407'],
  citation: 'UK GDPR — Regulation (EU) 2016/679 as it forms part of the law of the United Kingdom, Articles 5(1)(d) and 16',
  limb: "RECORDED PROVISION (retrieved 2026-10-04, official publisher legislation.gov.uk): Article 5(1)(d) — '(d) accurate and, where necessary, kept up to date; every reasonable step must be taken to ensure that personal data that are inaccurate, having regard to the purposes for which they are processed, are erased or rectified without delay (accuracy)'; Article 16 — 'The data subject shall have the right to obtain from the controller without undue delay the rectification of inaccurate personal data concerning him or her. Taking into account the purposes of the processing, the data subject shall have the right to have incomplete personal data completed, including by means of providing a supplementary statement.' Applicable edition: the edition in force (latest available revised version); the publisher records no textual amendment to Article 5(1)(d) or Article 16 (the recorded 2025 amendments fall on Article 5(1)(b), 5(1)(e) and the inserted Article 5(3)). Territorial extent: the instrument's own recorded 'U.K.' extent, recorded as relation " + RELATION_ID + ". Full record: SOURCE_CAPTURES/GB-UK-GDPR-ACCURACY/crp-lsrc-0407-provision-retrieval.json. Temporal applicability is a condition of attribution and is NOT the same as retention arithmetic: this rule performs no retention arithmetic and claims no commencement date.",
  anchor_mode: 'CONTENT_RELIABILITY',
  opened_field: 'liability.openedDate',
  closed_field: 'liability.closedDate',
  period_years: 0,
  record_kinds: ['CONSUMER_CREDIT_LIABILITY'],
  applicability_rule: 'ORDINARY_ACCOUNT_BOTH_DATES_PRESENT',
  applicability: { mode: 'EXPLICIT_REGION_RELATION', relation_id: RELATION_ID, country: 'GB' },
  presentation_required: 'GENERAL-BUREAU-REPORT',
  presentation_required_added_by: 'CRP_VERSION_1_FINISH_ORDER_001 (2026-10-04): the ordinary-account opened/closed structure is carried by the admitted general bureau-report intake, which every canonical region already drives. This rule is NOT bound to the GB consumer-disclosure family reader, whose current-format currency remains a separate open intake gap (CURRENT_GB_SUPPORT_IS_ESTABLISHED).',
  output_permission: { max_conclusion: 'probable_violation', finding_allowed: true, packet_eligible: false },
  exceptions: {
    recorded: false,
    basis: "The located provision states no exception. Whether the printed values are accurate is not resolvable from the report itself, so no exception is evaluated here and the conclusion ceiling stays PROBABLE_VIOLATION. Off-report knowledge — the controller's own records — is never inferred.",
    items: []
  },
  finding_gate: "ENABLED (2026-10-04): legal applicability and the evidence gate pass. CRP-LSRC-0407 is an owner-accepted row whose instrument class is STATUTE_OR_REGULATION with no confirmation required and whose legacy atomic rule uk.accuracy_duty.gdpr5 is an ESTABLISHED recorded mapping. Its recorded basis is the provision's own words retrieved from the official publisher, with the applicable edition, territorial extent and retrieval limitation recorded in SOURCE_CAPTURES/GB-UK-GDPR-ACCURACY/crp-lsrc-0407-provision-retrieval.json. The maximum conclusion is probable_violation, never violation: the report establishes that its own two printed values cannot both be right, and nothing in the report establishes which of them is inaccurate or whether a benign explanation applies. The same printed conflict reaches the consumer as ONE issue carrying both supported bases with one verification request. packet_eligible stays false; a PROBABLE content finding is packet-eligible by confidence, not by a widened per-rule permission.",
  source_version: 'FE5C1BA63AE85923E378D4278C3D6E85461E8DF648847F43FE02FB4185BD41F6',
  source_artifact: 'packages\\backend\\src\\services\\legalRules.ts'
};

/* ---- 1. the runtime adapter configuration ------------------------------------------------------------------ */
const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const at = config.adapters.findIndex((a) => a.adapter_id === ADAPTER_ID);
if (at >= 0) {
  config.adapters[at] = ENTRY;
} else {
  const after = config.adapters.findIndex((a) => a.adapter_id === 'CA-ON-CRA-S9-3-A-RELIABLE-EVIDENCE-BASIS');
  config.adapters.splice(after >= 0 ? after + 1 : config.adapters.length, 0, ENTRY);
}
fs.writeFileSync(CONFIG, `${JSON.stringify(config, null, 2)}\n`);

/* ---- 2. the explicit applicability relation (the instrument's own UK-wide extent) -------------------------- */
const records = JSON.parse(fs.readFileSync(RECORDS, 'utf8'));
const relation = {
  relation_id: RELATION_ID,
  adapter_ids: [ADAPTER_ID],
  mode: 'EXPLICIT_REGION_LIST',
  country: 'GB',
  instrument: 'Regulation (EU) 2016/679 (United Kingdom General Data Protection Regulation) — Articles 5(1)(d) and 16',
  instrument_class: 'UK_WIDE_STATUTE_OR_REGULATION',
  instrument_class_source: 'ledger owner_acceptance.instrument_class_screen = STATUTE_OR_REGULATION for CRP-LSRC-0407, with instrument_class_confirmation_required = false',
  source_entry_ids: ['CRP-LSRC-0407'],
  territorial_reach_basis: TERRITORIAL_BASIS,
  not_a_code_conversion: 'This relation is not a rename of the recorded UK token: it rests on the instrument\'s own recorded geographical extent, which the publisher prints on the provisions themselves. The off-report token route the ledger records as NOT adopted (resolving a bare UK token from a locked session nation or an account profile) is not used.',
  evidence: [
    { evidence_id: 'GB-UK-GDPR-OFFICIAL-EXTENT', kind: 'OFFICIAL_PUBLISHER_RETRIEVAL', locator: 'https://www.legislation.gov.uk/eur/2016/679/article/5 and https://www.legislation.gov.uk/eur/2016/679/article/16 (provision text via the publisher\'s data.xht?view=snippet pages)', what_it_establishes: 'the instrument is published under the title "(United Kingdom General Data Protection Regulation)", is kept up to date with amendments made by UK legislation, and its retrieved provisions carry the publisher\'s "U.K." geographical-extent marker' },
    { evidence_id: 'GB-RECORDED-REGIONAL-INSTRUMENTS', kind: 'LEDGER_RECORDED_REGION_CODES', locator: 'SOURCE_CAPTURES/PHASE5-001O/source_id_coverage_ledger.json rows carrying canonical_region_code GB-*', what_it_establishes: 'each canonical GB region carries its own recorded instrument and its own recorded canonical_region_code' },
    { evidence_id: 'GB-PROVISION-RETRIEVAL-RECORD', kind: 'SOURCE_CAPTURE', locator: 'SOURCE_CAPTURES/GB-UK-GDPR-ACCURACY/crp-lsrc-0407-provision-retrieval.json', what_it_establishes: 'the retrieved provision text, the applicable edition, the extent basis, the retrieval limitation and the attribution check' }
  ],
  region_state: REGION_STATE,
  region_basis: TERRITORIAL_BASIS,
  regions: GB_REGIONS.slice(),
  execution: 'BOUND_TO_A_RECORDED_STATUTE_ADAPTER',
  execution_note: 'the adapter reads the report\'s own two printed values on one ordinary account. It performs no retention arithmetic, states no period and claims no commencement date.',
  region_rows: GB_REGIONS.map((region) => ({
    region,
    class: 'REGION',
    state: REGION_STATE,
    basis: TERRITORIAL_BASIS,
    region_specific_report_retention_rule_recorded: null,
    no_region_specific_report_retention_rule_recorded: false,
    no_recorded_source_row: false,
    explicit_resolution: null,
    uk_wide_source_entry_ids_for_this_region: ['CRP-LSRC-0407'],
    recorded_source_entry_ids_for_this_region: ['CRP-LSRC-0407']
  })),
  region_row_count: GB_REGIONS.length
};
const ri = records.relations.findIndex((r) => r.relation_id === RELATION_ID);
if (ri >= 0) records.relations[ri] = relation; else records.relations.push(relation);
const confirmed = [...new Set([...(records.regions_with_a_confirmed_relation || []), ...GB_REGIONS])].sort();
records.regions_with_a_confirmed_relation = confirmed;
records.regions_with_an_executable_relation = confirmed.slice();
records.counts.relations = records.relations.length;
records.counts.regions_with_a_confirmed_relation = confirmed.length;
records.counts.regions_with_an_executable_relation = confirmed.length;
records.inputs.adapter_configs = sha256(CONFIG);
fs.writeFileSync(RECORDS, `${JSON.stringify(records, null, 2)}\n`);

/* ---- 3. the catalog mirror ----------------------------------------------------------------------------- */
const fresh = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
catalog.implemented_adapters = fresh.adapters;
catalog.inputs.adapter_configs = sha256(CONFIG);
for (const region of GB_REGIONS) {
  const row = (catalog.regions || []).find((r) => r.region === region);
  if (!row) continue;
  const coverage = (row.adapter_coverage || []).filter((c) => (typeof c === 'string' ? !c.startsWith(ADAPTER_ID) : c.adapter_id !== ADAPTER_ID));
  coverage.push({
    adapter_id: ADAPTER_ID,
    applicability_state: REGION_STATE,
    applicability_basis: TERRITORIAL_BASIS,
    relation_id: RELATION_ID,
    execution: 'BOUND_TO_A_RECORDED_STATUTE_ADAPTER',
    confirmed: true,
    unconfirmed_dependency: null
  });
  row.adapter_coverage = coverage;
}
fs.writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);

/* ---- 4. the served availability rows ------------------------------------------------------------------- */
const matrix = JSON.parse(fs.readFileSync(MATRIX, 'utf8'));
for (const region of GB_REGIONS) {
  const row = matrix.regions.find((r) => r.region === region);
  if (!row) continue;
  row.adapter_coverage = (row.adapter_coverage || [])
    .filter((t) => !String(t).startsWith(ADAPTER_ID))
    .concat([`${ADAPTER_ID}@${REGION_STATE}`]);
  row.executable_checks = 1;
  /* The classes the region can actually run. The classes already recorded for the region are PRESERVED — this
     batch adds a recorded statutory comparison, it does not withdraw the factual or printed-policy classes the
     region already had. */
  row.assessment_kinds = [...new Set([...(row.assessment_kinds || []), 'STATUTORY_RULE_COMPARISON', 'REPORT_FACT_CONSISTENCY', 'PRINTED_POLICY_OBSERVATION'])];
  row.applicability_state = 'MEANINGFUL_ASSESSMENT_WITH_RECORDED_STATUTORY_LIMB';
  row.evaluation_support = 'EXERCISED_LOCALLY:1_CHECKS';
  row.report_format_support = 'EXERCISED_LOCALLY:FAM-GB-EXP-CONSUMER+GENERAL-BUREAU-REPORT';
}
matrix.regions_with_an_adapter = matrix.regions.filter((r) => (r.adapter_coverage || []).length).length;
if (matrix.adapter_and_catalog_summary) {
  matrix.adapter_and_catalog_summary.implemented_adapters = fresh.adapters.map((a) => a.adapter_id);
  matrix.adapter_and_catalog_summary.catalog_policy = matrix.adapter_and_catalog_summary.catalog_policy
    || 'A recorded legacy mapping is a CANDIDATE, never a working function.';
}
matrix.inputs = Object.assign({}, matrix.inputs, {
  rule_adapter_catalog: sha256(CATALOG),
  applicability_records: sha256(RECORDS)
});
fs.writeFileSync(MATRIX, `${JSON.stringify(matrix, null, 2)}\n`);

console.log(`GB accuracy outcome wired: ${fresh.adapters.length} adapters; relation ${RELATION_ID} bound to ${GB_REGIONS.length} regions; regions_with_an_adapter=${matrix.regions_with_an_adapter}`);

module.exports = { ADAPTER_ID, RELATION_ID, GB_REGIONS, REGION_STATE, TERRITORIAL_BASIS, ENTRY, CONFIG, RECORDS, CATALOG, MATRIX, sha256 };
