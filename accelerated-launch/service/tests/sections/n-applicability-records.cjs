'use strict';
/**
 * n-applicability-records.cjs — OWNER-ALL82-001 / B3. Every claimed association is tested, for every region.
 *
 * Plan section 2: "National checks may serve multiple regions only through an explicit supported
 * applicability relation. Merely changing the region label does not create region-specific statutory
 * coverage." This section is the test of that sentence: it reads the records file, the canonical enumeration,
 * the ledger (read-only) and the adapter configuration, and it fails if any region is reached by a pattern, by
 * a default, or by an instrument the records do not name.
 *
 * Nothing here reads a consumer report. The ledger and the enumeration are read as metadata.
 */

const fs = require('node:fs');
const path = require('node:path');

const adapters = require('../../../adapters/rule-adapters.cjs');
const records = require('../../../adapters/applicability-records.json');
const config = require('../../../adapters/adapter-configs.json');
const { selectJurisdiction } = require('../../../jurisdiction-router.cjs');
const matrix = require('../../../launch-matrix.json');
const evaluation = require('../../evaluation.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const EXECUTION_TOKENS = [
  'EXECUTABLE_ON_THE_ADMITTED_AU_CONSUMER_FAMILY',
  'EXECUTABLE_ON_THE_ADMITTED_US_CONSUMER_DISCLOSURE_FAMILY',
  'EXECUTABLE_WHERE_A_BOUND_PRESENTATION_IS_ADMITTED',
  'BOUND_TO_A_RECORDED_STATUTE_ADAPTER',
  'NOT_EXECUTED_INSTRUMENT_RECORDED_AS_GUIDANCE_NOT_A_STATUTE',
  'NOT_EXECUTED_RELATION_UNRESOLVED'
];

function canonicalRegions() {
  const raw = fs.readFileSync(path.join(ROOT, 'consumer-wizard', 'dist', 'jurisdiction-data.js'), 'utf8');
  const data = JSON.parse(raw.slice(raw.indexOf('window.CRP_JURISDICTION_DATA = ') + 30).trim().replace(/;\s*$/, ''));
  return data.regions.map((r) => ({ region: r.region_code, country: r.country_code }));
}

function ledgerRows() {
  return JSON.parse(fs.readFileSync(
    path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001O', 'source_id_coverage_ledger.json'), 'utf8'
  )).rows;
}

function enumCompleteness(check) {
  const canonical = canonicalRegions();
  check.equal(canonical.length, 82, 'the canonical enumeration still carries 82 regions');

  const allRows = records.relations.flatMap((r) => r.region_rows);
  const namedOnce = new Set(allRows.map((r) => r.region));
  check.equal(namedOnce.size, 82, 'every canonical region carries at least one applicability row');
  const rowCount = {};
  for (const r of allRows) rowCount[r.region] = (rowCount[r.region] || 0) + 1;
  check.deepEqual(Object.keys(rowCount).filter((r) => rowCount[r] > 1).sort(), ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS'],
    'and only the four GB regions carry two rows: the recorded naming relation and the recorded statutory accuracy relation');
  check.equal(allRows.length, 86, 'so the file carries eighty-two region rows plus the four GB statutory rows');

  for (const relation of records.relations) {
    const named = relation.region_rows.map((r) => r.region).sort();
    const expected = canonical.filter((r) => r.country === relation.country).map((r) => r.region).sort();
    check.deepEqual(named, expected, `${relation.relation_id}: the named regions equal the canonical ${relation.country} set`);
    check.ok(EXECUTION_TOKENS.includes(relation.execution), `${relation.relation_id}: execution is a recorded token`);
    for (const row of relation.region_rows) {
      check.ok(!/[*?]/.test(row.region), `${relation.relation_id}: ${row.region} carries no pattern token`);
      check.ok(!/propagat|inherit|defaulted from the country/i.test(String(row.basis)), `${row.region}: its basis claims no propagation`);
    }
  }

  check.equal(records.counts.regions_with_a_confirmed_relation, 69, '69 regions carry a confirmed relation');
  check.equal(records.counts.regions_with_an_executable_relation, 69,
    'and 69 of them may execute a check: the eight Australian, the fifty-seven United States and the four GB regions');
  check.deepEqual(records.regions_with_an_executable_relation.filter((r) => r.startsWith('AU-')),
    ['AU-ACT', 'AU-NSW', 'AU-NT', 'AU-QLD', 'AU-SA', 'AU-TAS', 'AU-VIC', 'AU-WA'],
    'the eight Australian regions are among them');
  check.equal(records.regions_with_an_executable_relation.filter((r) => r.startsWith('US-')).length, 57,
    'and so are all fifty-seven United States regions');

  for (const adapter of config.adapters) {
    if (adapter.applicability.mode !== 'EXPLICIT_REGION_RELATION') continue;
    const relation = records.relations.find((r) => r.relation_id === adapter.applicability.relation_id);
    check.ok(relation, `${adapter.adapter_id}: its relation exists`);
    check.ok(relation.adapter_ids.includes(adapter.adapter_id), `${adapter.adapter_id}: its relation binds it back`);
  }
  check.deepEqual(adapters.verifyConfigs(), [], 'the adapter registry is structurally consistent with the records');

  /* REGRESSION GUARD — no admitted relation may be silently dropped by regeneration.
     The defect this guards was narrow and real: the applicability builder's own RELATIONS list omitted an
     admitted relation, so re-running it rewrote the artifact without that relation, without its four region
     mappings and without its recorded source. The builder is the source of this artifact, so it must declare
     every relation the artifact carries. */
  const builderPath = path.join(ROOT, 'accelerated-launch', 'build_applicability_records.py');
  const declared = new Set([...fs.readFileSync(builderPath, 'utf8')
    .matchAll(/'relation_id':\s*'([^']+)'/g)].map((m) => m[1]));
  check.deepEqual([...declared].sort(), records.relations.map((r) => r.relation_id).sort(),
    'the applicability builder declares every admitted relation, so regeneration cannot silently drop one');
  const gbAccuracy = records.relations.find((r) => r.relation_id === 'GB-UK-GDPR-ACCURACY-COUNTRY-WIDE');
  check.ok(gbAccuracy, 'the admitted GB statutory-accuracy relation is still carried by the artifact');
  check.deepEqual(gbAccuracy.region_rows.map((r) => r.region).sort(),
    ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS'], 'and it still carries its four region mappings');
  check.deepEqual([...new Set(gbAccuracy.region_rows
    .flatMap((r) => r.uk_wide_source_entry_ids_for_this_region || []))].sort(),
    gbAccuracy.source_entry_ids.slice().sort(), 'and its rows still reference its recorded source');
}

/* ------------------------------------------------------------------ the United States, territory by territory */

function unitedStates(check) {
  const relation = records.relations.find((r) => r.relation_id === 'US-FCRA-15-USC-1681C-COUNTRY-WIDE');
  check.equal(relation.region_rows.length, 57, 'every United States region carries its own row');
  check.equal(relation.region_rows.filter((r) => r.class === 'STATE_OR_FEDERAL_DISTRICT').length, 51,
    'the fifty states and the district are their own class');
  check.equal(relation.region_rows.filter((r) => r.class === 'TERRITORY_OR_POSSESSION_WITH_A_RECORDED_SOURCE').length, 5,
    'and the five territories with a recorded source are named individually');
  check.equal(relation.region_rows.filter((r) => r.class === 'TERRITORY_WITH_NO_RECORDED_SOURCE').length, 1,
    'and the one with no recorded source carries its own class');
  check.match(relation.recorded_finding_on_a_state_definition, /NO definition of the term "State"/,
    'the records state plainly that no territorial listing was borrowed from a definition that was not seen');
  check.equal(relation.execution, 'EXECUTABLE_ON_THE_ADMITTED_US_CONSUMER_DISCLOSURE_FAMILY',
    'and the United States relation now executes on an admitted presentation');
  check.equal(relation.limbs_bound_to_a_printed_anchor.length, 1,
    'exactly one United States limb is bound to a printed anchor');
  check.equal(relation.limbs_bound_to_a_printed_anchor[0][0], 'CRP-LSRC-0003',
    'the adverse-item limb, on the recorded row');
  check.equal(relation.limbs_resolved_for_applicability_without_an_anchor.length, 4,
    'and four are resolved for applicability without an anchor, rather than dropped');

  const rows = ledgerRows();
  for (const code of ['US-AS', 'US-GU', 'US-MP', 'US-PR', 'US-VI']) {
    const recorded = rows.filter((r) => r.established_jurisdiction_associations.canonical_region_code === code);
    check.ok(recorded.length > 0, `${code}: the ledger records something for it in its own right`);
    const row = relation.region_rows.find((r) => r.region === code);
    check.ok(row.regional_instruments_recorded.length > 0, `${code}: its own recorded instrument is carried into the record`);
    check.equal(row.no_region_specific_report_retention_rule_recorded, true,
      `${code}: and the record says no region-specific report retention rule is recorded for it`);
  }

  const um = relation.region_rows.find((r) => r.region === 'US-UM');
  check.ok(um, 'the region with no recorded source still carries a row');
  check.equal(rows.filter((r) => r.established_jurisdiction_associations.canonical_region_code === 'US-UM').length, 0,
    'the ledger really does carry no row for it, which is what the record states');
  check.deepEqual(um.regional_instruments_recorded, [], 'no instrument is invented for it');
  check.equal(um.no_recorded_source_row, true);
  check.match(um.explicit_resolution, /No regional instrument is invented/);
}

/* ------------------------------------------------------------------ the UK/GB naming relation */

function unitedKingdom(check) {
  const relation = records.relations.find((r) => r.relation_id === 'GB-UNITED-KINGDOM-NAMING-AND-REGION-RELATION');
  check.equal(relation.region_rows.length, 4, 'all four canonical GB regions are resolved');
  check.deepEqual(relation.region_rows.map((r) => r.region).sort(), ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS']);
  check.equal(relation.region_rows.filter((r) => r.state.startsWith('CONFIRMED')).length, 0, 'and none claims a confirmed statute');
  check.equal(relation.execution, 'NOT_EXECUTED_INSTRUMENT_RECORDED_AS_GUIDANCE_NOT_A_STATUTE',
    'the recorded material is guidance, so no adapter is bound to it');
  check.equal(relation.adapter_ids.length, 0, 'and the relation binds no adapter at all');
  check.equal(relation.instrument_class, 'GUIDANCE_OR_POLICY_SUMMARY');
  check.match(relation.residual_token_resolution.resolved_by, /canonical_region_code GB-ENG/,
    'the UK token is resolved through recorded region codes, not by renaming it');
  check.match(relation.residual_token_resolution.does_not_establish, /statutory applicability/,
    'and the resolution states what it does NOT establish');
  check.match(relation.not_a_code_conversion, /renaming a token/,
    'and the code-conversion shortcut is refused in writing');

  const rows = ledgerRows();
  for (const code of ['GB-ENG', 'GB-WLS', 'GB-SCT', 'GB-NIR']) {
    const recorded = [...new Set(rows
      .filter((r) => r.established_jurisdiction_associations.canonical_region_code === code
        && r.owner_acceptance.state === 'OWNER_ACCEPTED_LEGAL_AUTHORITY')
      .map((r) => r.legacy_statute_or_provision.instrument_title))];
    check.ok(recorded.length > 0, `${code}: the ledger records its own instrument`);
    const row = relation.region_rows.find((r) => r.region === code);
    for (const title of recorded) {
      check.ok(row.regional_instruments_recorded.includes(title), `${code}: ${title} is carried into the record`);
    }
  }
  check.equal(adapters.adaptersForRegion('GB-ENG').length, 1, 'one recorded statutory limb is offered to a GB selection');
  const gbLimb = adapters.adaptersForRegion('GB-ENG')[0];
  check.equal(gbLimb.adapter_id, 'GB-UK-GDPR-ART5-1-D-ART16-ACCURACY', 'namely its own recorded accuracy/rectification limb');
  check.equal(gbLimb.confirmed, true, 'reached through a recorded relation, not through a renamed token');
  check.equal(gbLimb.relation_id, 'GB-UK-GDPR-ACCURACY-COUNTRY-WIDE', 'and the relation is named on the applicability it reports');
  for (const code of ['GB-WLS', 'GB-SCT', 'GB-NIR']) {
    check.equal(adapters.adaptersForRegion(code).length, 1, `${code}: the same recorded limb is offered`);
  }
}


/* ------------------------------------------------------------------ Australia and Canada */

function australiaAndCanada(check) {
  const au = records.relations.find((r) => r.relation_id === 'AU-PRIVACY-ACT-1988-CTH-CREDIT-REPORTING');
  check.equal(au.instrument_class, 'COMMONWEALTH_STATUTE', 'the Australian relation rests on a Commonwealth statute');
  check.equal(au.region_rows.length, 8);
  check.ok(au.region_rows.every((r) => r.state === 'CONFIRMED'), 'every Australian region is confirmed');
  check.ok(au.region_rows.every((r) => r.regional_instruments_recorded.length > 0),
    'and each carries its own recorded regional instrument beside the federal one');
  check.equal(au.limbs_not_executable_because_not_report_evidenced.length, 8,
    'the eight limbs the family does not print at all are listed rather than dropped');
  check.equal(au.limbs_held_because_the_anchored_value_is_not_printed.length, 0,
    'nothing is held any longer: the per-record applicability expression closed the one held limb');
  check.equal(au.limbs_bound_to_a_printed_anchor.length, 1,
    'exactly one limb is bound to a printed anchor');
  const boundLimb = au.limbs_bound_to_a_printed_anchor[0];
  check.equal(boundLimb[0], 'CRP-LSRC-0428', 'the bound limb is the recorded s. 20W item 1 consumer-credit-liability rule');
  check.match(boundLimb[2], /Closed Date/, 'and it is anchored to the record\'s own printed `Closed Date`');
  check.match(boundLimb[2], /Current Repayment Status/,
    'with the record\'s own printed status named for the case where the closure label carries no value');
  check.equal(au.evidence.filter((e) => e.evidence_id === 'AU-PUB-012').length, 1,
    'the relation names the exact artifact its report representation was evidenced from');
  check.equal(adapters.adaptersForRegion('AU-NSW').length, 3,
    'and all three bound Australian adapters still reach every Australian region');

  const ca = records.relations.find((r) => r.relation_id === 'CA-PIPEDA-FEDERAL-RECORDED-COUNTRY-WIDE');
  check.equal(ca.region_rows.length, 13);
  check.equal(ca.execution, 'NOT_EXECUTED_RELATION_UNRESOLVED');
  check.equal(ca.adapter_ids.length, 0, 'the unresolved Canadian relation binds no adapter');
  check.equal(ca.region_rows.filter((r) => r.state === 'UNRESOLVED_RELATION_NOT_ESTABLISHED').length, 12,
    'twelve provinces and territories are recorded as unresolved');
  const ns = ca.region_rows.find((r) => r.region === 'CA-NS');
  check.equal(ns.state, 'EXACT_REGION_ASSOCIATION_RECORDED_SEPARATELY', 'and CA-NS is recorded as reaching its own exact records');
  check.match(ns.basis, /neither reaches it nor alters it/);
  check.equal(adapters.adaptersForRegion('CA-NS').length, 4, 'CA-NS keeps exactly its four exact-region adapters');
  const caOn = adapters.adaptersForRegion('CA-ON');
  check.equal(caOn.length, 1, 'and Ontario carries exactly its own recorded limb');
  check.equal(caOn[0].adapter_id, 'CA-ON-CRA-S9-3-A-RELIABLE-EVIDENCE-BASIS', 'which is its own exact-region record, not an inherited Nova Scotia limb');
  check.equal(caOn[0].confirmed, true, 'and is confirmed for that region');
  check.equal(adapters.adaptersForRegion('CA-MB').length, 1, 'Manitoba carries its own recorded limb (BATCH-12)');
  check.equal(adapters.adaptersForRegion('CA-MB')[0].adapter_id, 'CA-MB-PIA-S4-E-JUDGMENT-CONTENT-OMISSION', 'which is its own exact-region record, not an inherited Nova Scotia limb');
  check.equal(adapters.adaptersForRegion('CA-SK').length, 2, 'while Saskatchewan now carries its own two recorded limbs (BATCH-19)');
  check.equal(adapters.adaptersForRegion('CA-ZZ').length, 0, 'and a region with no recorded limb of its own is offered none');
}

/* ------------------------------------------------------------------ every adapter's presentation dependency */

function presentationDependencies(check) {
  const admitted = new Set(['PR-01', 'FAM-AU-EQX-CONSUMER', 'US-CONSUMER-DISCLOSURE', 'FAM-TU-CA-CONSUMER', 'GENERAL-BUREAU-REPORT']);
  const documented = new Set(Object.keys(config.presentations).concat(['GENERAL-BUREAU-REPORT']));
  const registered = new Set();
  for (const adapter of config.adapters) {
    const req = adapter.presentation_required;
    if (!req) continue;
    const list = Array.isArray(req) ? req : [req];
    for (const id of list) {
      registered.add(id);
      check.ok(documented.has(id), `${adapter.adapter_id}: presentation ${id} is documented in the configuration`);
    }
  }
  check.ok(registered.has('PR-01') && registered.has('FAM-AU-EQX-CONSUMER') && registered.has('US-CONSUMER-DISCLOSURE'),
    'the three admitted presentations are bound by at least one adapter each');
  const unadmitted = [...registered].filter((id) => !admitted.has(id));
  check.deepEqual(unadmitted, [], 'and no adapter is bound to a presentation this build has not admitted');
  check.match(config.presentations['US-CONSUMER-DISCLOSURE'], /admitted/i);
  check.ok(!/NOT ADMITTED IN THIS BUILD/.test(config.presentations['US-CONSUMER-DISCLOSURE']),
    'the United States presentation is no longer recorded as unadmitted');
}

/* ------------------------------------------------------------------ the router still routes all 82 */

function routerContract(check) {
  check.equal(matrix.regions.length, 82);
  for (const row of matrix.regions) {
    const selected = selectJurisdiction(row.country, row.region);
    check.equal(selected.region, row.region, `${row.region}: the router still resolves it`);
    check.equal(selected.launchReady, false, `${row.region}: and still advertises no launch readiness`);
  }
  check.equal(matrix.regions.filter((r) => r.launch_ready).length, 0, 'no region is launch ready');
}

async function run(t, check) {
  enumCompleteness(check);
  unitedStates(check);
  unitedKingdom(check);
  australiaAndCanada(check);
  presentationDependencies(check);
  routerContract(check);
  const surface = await surfaceAvailability(t, check);
  return {
    records: records.counts,
    regions_with_a_confirmed_relation: records.counts.regions_with_a_confirmed_relation,
    regions_with_an_executable_relation: records.regions_with_an_executable_relation,
    surface_availability_counts: surface
  };
}

/**
 * Plan section 2: "Any limitations in regional checks must be visible before purchase and upload." The
 * surface the wizard reads before anything is uploaded must therefore carry, per region, what can be read and
 * what would be checked — and it must agree with the records and with the tests.
 */
async function surfaceAvailability(t, check) {
  const response = await t.request('GET', '/api/jurisdictions');
  check.equal(response.status, 200, 'the jurisdiction surface is served');
  const surface = response.json.surface;
  check.equal(surface.regions.length, 82, 'it carries every canonical region');
  check.ok(surface.regions.every((r) => r.launch_ready === false), 'and advertises none of them as launch ready');
  check.ok(surface.regions.every((r) => r.availability && typeof r.availability.plain === 'string' && r.availability.plain.length > 0),
    'and states, for every region, what this build can read and check for it');
  check.match(surface.note, /before you upload anything/, 'and says that this is stated before an upload');

  const counts = {};
  for (const region of surface.regions) {
    counts[region.availability.state] = (counts[region.availability.state] || 0) + 1;
    if (region.availability.state === 'SUPPORTED') {
      check.equal(region.checklist_items, 19,
        `${region.value}: the shared checklist scope is available before upload`);
      check.ok(region.supported_format_families.length >= 1, `${region.value}: names its available reader paths`);
      check.equal(region.working_assessment, true);
      check.ok(region.assessment_kinds.length >= 1, `${region.value}: and names which classes of check actually ran`);
    } else {
      check.equal(region.executable_checks, 0, `${region.value}: an unsupported region claims no check`);
      check.equal(region.supported_format_families.length, 0, `${region.value}: and names no format family`);
    }
  }
  /* A region is counted as supported only when a format family is registered for its market AND a check of
     some class actually ran on real evidence. The counts are read from the matrix, not assumed here. */
  check.equal(counts.SUPPORTED, 82,
    'all eighty-two regions report a working assessment: eight Australian, thirteen Canadian, fifty-seven United States and four British');
  const byCountry = {};
  for (const region of surface.regions) byCountry[region.country] = (byCountry[region.country] || 0) + 1;
  check.deepEqual(byCountry, { CA: 13, US: 57, GB: 4, AU: 8 }, 'and the four country batches account for exactly those 82');
  const activeRuleRegions = canonicalRegions().filter((r) => evaluation.applicableAdapters(r.region).confirmed.length > 0);
  check.equal(activeRuleRegions.length, 78,
    '78 selections currently have a confirmed checklist-related statutory support adapter; the shared checklist remains all 82');
  check.deepEqual(canonicalRegions().filter((r) => !activeRuleRegions.some((a) => a.region === r.region))
    .map((r) => r.region), ['CA-MB', 'CA-NB', 'CA-NL', 'CA-PE'],
    'four Canadian selections use report-data rules without a province-specific active statutory adapter');
  for (const region of surface.regions) {
    const hasActiveStatutorySupport = evaluation.applicableAdapters(region.value).confirmed.length > 0;
    check.equal(region.assessment_kinds.includes('STATUTORY_RULE_COMPARISON'), hasActiveStatutorySupport,
      `${region.value}: public rule-comparison label matches the active checklist-related adapter scope`);
    check.ok(region.assessment_kinds.includes('COMMON_ERROR'), `${region.value}: the shared common-error path is available`);
    check.equal(region.statutory_support_checks, evaluation.applicableAdapters(region.value).confirmed.length,
      `${region.value}: statutory support is recorded independently of the checklist item count`);
    if (!hasActiveStatutorySupport) check.ok(region.assessment_kinds.includes('REPORT_FACT_CONSISTENCY'),
      `${region.value}: factual support remains available without a statutory adapter`);
  }
  check.equal(surface.regions.filter((r) => r.assessment_kinds.includes('REPORT_FACT_CONSISTENCY')).length, 17,
    'seventeen of them ran factual checks about what their report prints: the thirteen Canadian and four British');
  check.equal(surface.regions.filter((r) => r.assessment_kinds.includes('PRINTED_POLICY_OBSERVATION')).length, 4,
    'and four of them ran a printed policy observation: the four British');
  check.equal(surface.regions.filter((r) => r.availability.state !== 'SUPPORTED').length, 0,
    'no region is left without a registered format path any more');
  check.equal(counts.SUPPORTED + (counts.FORMAT_AVAILABLE_NO_CHECK || 0) + (counts.NO_REPORT_FORMAT || 0), 82,
    'so all eighty-two canonical regions are still accounted for exactly once');
  return counts;
}

module.exports = { run, id: 'n-applicability', title: 'Explicit per-region applicability, tested for every region' };
