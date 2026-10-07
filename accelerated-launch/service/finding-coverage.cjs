'use strict';
/**
 * BLOCKER-FINDING-COVERAGE-001: active common-error coverage inventory.
 * Structural reader fields and an available rule are not proof that a report
 * contains decisive evidence or that an upload-to-packet journey has passed.
 * Historical statutory adapter counts are deliberately excluded from this
 * active release measure under CRP_OWNER_IMMUTABLE_VIOLATION_STANDARD_001.
 */
const fs = require('node:fs');
const path = require('node:path');
const { CHECKS } = require('./common-error-checklist.cjs');
const { FACTUAL_CHECK_CAPABILITY, PRESENTATION_FIELD_CAPABILITY, presentationCapability } = require('./common-errors.cjs');
const { REPORT_RULES } = require('./common-error-rule-assessment.cjs');
const { CHECKLIST_STATUTORY_SUPPORT } = require('./common-error-scope.cjs');
const APPLICABILITY = require('../adapters/applicability-records.json');

const OUT = path.join(__dirname, 'out', 'finding-coverage-evidence.json');
const REGIONS = Object.freeze({
  CA: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
  US: ['AK', 'AL', 'AR', 'AS', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'GU', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MP', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UM', 'UT', 'VA', 'VI', 'VT', 'WA', 'WI', 'WV', 'WY'],
  GB: ['ENG', 'NIR', 'SCT', 'WLS'],
  AU: ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']
});

function allRegions() {
  return Object.entries(REGIONS).flatMap(([country, regions]) => regions.map((region) => `${country}-${region}`));
}

const OMISSION_UMBRELLA = 'COMMON-ERROR-REQUIRED-REPORT-DATA-VISIBLY-MISSING';
const PERIOD_ITEM = 'LIMITATION-PERIOD-COURT-CLAIM';
function mappingFor(item) {
  const id = item.check_id;
  const spec = FACTUAL_CHECK_CAPABILITY[id];
  if (id === PERIOD_ITEM) return { ...item, scope: 'JURISDICTION_SPECIFIC_PERIOD',
    requirement: 'Apply only the accepted jurisdictional reporting-period or court-claim rule with its required source anchor.',
    source_requirements: ['accepted applicable period', 'source-linked triggering date and report reference date'] };
  if (!spec) throw new Error(`Missing common-error capability mapping: ${id}`);
  if (id === OMISSION_UMBRELLA) return { ...item, scope: 'GROUPING_ONLY',
    component_checks: [
      'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR',
      'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE',
      'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE'
    ], requirement: null, field_sets: [], additional_evidence: spec.additional_evidence };
  return { ...item, scope: REPORT_RULES[id] ? 'REPORT_DATA_RULE' : 'FACTUAL_REVIEW',
    requirement: REPORT_RULES[id] || null, field_sets: spec.field_sets.map((set) => [...set]),
    additional_evidence: spec.additional_evidence || null };
}

function main() {
  const regions = allRegions();
  const catalogRegions = Object.keys(APPLICABILITY.region_applicability_index);
  if (regions.length !== 82 || regions.some((region) => !catalogRegions.includes(region))
    || catalogRegions.some((region) => !regions.includes(region))) throw new Error('COMMON_ERROR_REGION_INVENTORY_DRIFT');
  const mapping = CHECKS.map(mappingFor);
  const presentations = Object.keys(PRESENTATION_FIELD_CAPABILITY).map((id) => {
    const capability = presentationCapability(id);
    return { presentation_id: id, all_factual_checks: capability.all_factual_checks,
      retained_fields_without_a_usable_check: capability.retained_fields_without_a_usable_check,
      basis: capability.basis };
  });
  const ruleIds = mapping.filter((item) => item.scope === 'REPORT_DATA_RULE').map((item) => item.check_id);
  const reviewIds = mapping.filter((item) => item.scope === 'FACTUAL_REVIEW').map((item) => item.check_id);
  const evidence = {
    passed: false,
    measured_at: new Date().toISOString(),
    scope: 'Active version 1 common-error checklist only; 82 jurisdiction selections. Historical out-of-checklist statutory adapters are not active violation coverage.',
    identity: { build_id: process.env.CRP_BUILD_ID || null, served_build_id: null },
    implementation: { configured: false, status: 'OPEN',
      reason: 'Shared checklist and rule mapping exist, but field availability, source-proven violations, each family journey, and packet delivery require separate evidence. This inventory does not establish full substantive coverage.' },
    staging_verification: { status: 'PENDING', reason: 'Current served-release common-error upload-to-packet evidence has not been recorded.' },
    counting_units: { note: 'One active checklist item; the omission umbrella is a grouping, not a second violation. Statutory adapters and citations are not active counting units.',
      selected_jurisdictions: regions.length, checklist_items: mapping.length,
      report_data_rule_checks: ruleIds.length, factual_review_checks: reviewIds.length,
      omission_groupings: 1, jurisdiction_specific_period_items: 1 },
    check_mapping: mapping,
    optional_statutory_support: Object.entries(CHECKLIST_STATUTORY_SUPPORT).map(([adapter_id, checklist_context]) => ({
      adapter_id, checklist_context, mandatory_gate: false
    })),
    presentation_capability: presentations,
    region_coverage: Object.fromEntries(regions.map((region) => [region, {
      checklist_items_available: mapping.map((item) => item.check_id),
      all_check_and_reader_paths_demonstrated: false,
      note: 'A shared all-82 account-date path has local test evidence; selector availability does not demonstrate every check or report family.'
    }])),
    executable_findings: { report_data_rule_checks: ruleIds, review_only_checks: reviewIds,
      demonstrated_all_checks_all_formats: false,
      note: 'A rule can produce a violation only after the particular report supplies decisive source-linked facts or a proved omission. No statute is a mandatory gate.' },
    material_questions: { status: 'NOT_A_GATE', note: 'No consumer answer substitutes for a required report field or establishes a common-error breach.' },
    behavioral_coverage: { status: 'PARTIAL', note: 'Shared all-82 and representative report-family tests are local implementation evidence; field and account-link gaps remain family specific.' },
    end_to_end_journey: { status: 'PENDING', note: 'A current served-release common-error upload-to-selected-packet journey has not been recorded.' },
    criteria: {
      promise_inventory: { passed: regions.length === 82 && mapping.length === CHECKS.length,
        expected: 'all 82 selections and the active checklist', measured: `${regions.length} selections; ${mapping.length} checklist items` },
      check_mapping: { passed: mapping.every((item) => item.scope && (item.requirement || item.scope === 'FACTUAL_REVIEW' || item.scope === 'GROUPING_ONLY')),
        expected: 'each listed item mapped to a report-data rule, review, grouping, or jurisdiction-specific period',
        measured: `${ruleIds.length} report-data rules; ${reviewIds.length} review checks; one grouping; one period item` },
      executable_findings: { passed: false, expected: 'source-proven positive and negative cases for each rule-assessable check', measured: 'not established by this inventory' },
      material_questions: { passed: false, expected: 'questions materially affect only supported checklist decisions', measured: 'not established by this inventory' },
      behavioral_coverage: { passed: false, expected: 'meaningful family and all-82 behavior for the active checklist', measured: 'partial local test coverage; not all reader gaps closed' },
      end_to_end_journey: { passed: false, expected: 'current served-release upload through selected, approved packet', measured: 'staging pending' }
    }
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

if (require.main === module) {
  const evidence = main();
  process.stdout.write(`finding-coverage-evidence.json written (OPEN): ${evidence.counting_units.checklist_items} checklist items across ${evidence.counting_units.selected_jurisdictions} selections\n`);
}

module.exports = { main, allRegions, mappingFor };
