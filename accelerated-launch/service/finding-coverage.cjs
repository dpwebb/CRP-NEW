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
const crypto = require('node:crypto');
const { currentInventory } = require('./fdt-acceptance.cjs');
const { CHECKS } = require('./common-error-checklist.cjs');
const { FACTUAL_CHECK_CAPABILITY, PRESENTATION_FIELD_CAPABILITY, presentationCapability } = require('./common-errors.cjs');
const { REPORT_RULES } = require('./common-error-rule-assessment.cjs');
const { CHECKLIST_STATUTORY_SUPPORT } = require('./common-error-scope.cjs');
const APPLICABILITY = require('../adapters/applicability-records.json');

const OUT = path.join(__dirname, 'out', 'finding-coverage-evidence.json');
const ROOT = path.resolve(__dirname, '../..');
const REGRESSION = 'accelerated-launch/service/out/current-regression-evidence.json';
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

// These are inspected behavioral tests, not capability-field counts. Each entry
// names positive and refusal/benign tests and the actual delivery mechanism.
const CHECK_PROOF = Object.freeze(Object.fromEntries([
  ['ACCOUNT-DATES-CONTRADICTORY', ['cw-common-error-rule-assessment', 'cy-common-error-predicate-repairs'], ['bx-all82-factual-verification'], 'FICTIONAL_NATIVE_PDF_UPLOAD'],
  ['STATUS-DATE-CONTRADICTION', ['cw-common-error-rule-assessment', 'cy-common-error-predicate-repairs'], ['cw-common-error-rule-assessment'], 'FICTIONAL_NATIVE_PDF_UPLOAD'],
  ['BALANCE-PAYMENT-INCONSISTENCY', ['cy-common-error-predicate-repairs', 'bp-prime-directive-batch2'], ['bp-prime-directive-batch2', 'ce-tu-ca-account-material'], 'NATIVE_UPLOAD_AND_DOWNSTREAM_FAMILY_CONTROL'],
  ['REVOLVING-BALANCE-ZERO-LIMIT', ['cw-common-error-rule-assessment', 'df-us-common-error-reader'], ['df-us-common-error-reader', 'dl-general-caption-sources'], 'FICTIONAL_NATIVE_PDF_UPLOAD'],
  ['PAYMENT-HISTORY-INCONSISTENCY', ['al-common-errors', 'dt-rating-history-rows'], ['du-column-reader-delivery', 'di-au-reader-completion'], 'FICTIONAL_NATIVE_PDF_UPLOAD'],
  ['RESPONSIBILITY-INCONSISTENCY', ['cw-common-error-rule-assessment', 'cy-common-error-predicate-repairs'], ['dy-reader-date-delivery'], 'FICTIONAL_NATIVE_PDF_UPLOAD'],
  ['DUPLICATE-REPORTING', ['cy-common-error-predicate-repairs', 'ei-collection-duplicate'], ['ei-collection-duplicate', 'eb-account-packet-support'], 'NATIVE_UPLOAD_AND_CONTROLLED_PERSISTED_FACTS'],
  ['SIMILAR-ENTRIES-WORTH-REVIEWING', ['al-common-errors'], [], 'REVIEW_ONLY_CONTROLLED_FACTS'],
  ['REPORTED-DATES-OUT-OF-ORDER', ['cw-common-error-rule-assessment', 'df-us-common-error-reader'], ['de-tu-ca-common-error-sources'], 'NATIVE_READER_AND_DOWNSTREAM_FAMILY_CONTROL'],
  ['POTENTIAL-RE-AGING-SIGNAL', ['dg-owned-reaging', 'cy-common-error-predicate-repairs'], ['dg-owned-reaging', 'du-column-reader-delivery', 'eh-packet-report-exhibits'], 'OWNED_EARLIER_CURRENT_NATIVE_UPLOADS'],
  ['IDENTITY-REVIEW', ['al-common-errors'], [], 'REPORT_INTERNAL_REVIEW_NOT_VIOLATION'],
  ['ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR', ['ce-tu-ca-account-material', 'eu-general-omission-delivery'], ['eu-general-omission-delivery'], 'FICTIONAL_NATIVE_PDF_UPLOAD'],
  ['WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE', ['ce-tu-ca-account-material', 'eu-general-omission-delivery'], ['eu-general-omission-delivery'], 'FICTIONAL_NATIVE_PDF_UPLOAD'],
  ['CLOSURE-STATED-WITHOUT-A-CLOSED-DATE', ['cx-all82-required-report-data', 'dr-reader-evidence-delivery', 'eu-general-omission-delivery'], ['dr-reader-evidence-delivery', 'eu-general-omission-delivery'], 'NATIVE_UPLOAD_AND_DOWNSTREAM_FAMILY_CONTROL'],
  ['REQUIRED-REPORT-DATA-VISIBLY-MISSING', ['ct-owner-common-error-scope', 'eu-general-omission-delivery'], [], 'GROUPING_ONLY'],
  ['PAID-SETTLED-SHOWN-UNPAID', ['cy-common-error-predicate-repairs', 'df-us-common-error-reader'], ['du-column-reader-delivery'], 'FICTIONAL_NATIVE_PDF_UPLOAD'],
  ['LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE', ['cw-common-error-rule-assessment', 'de-tu-ca-common-error-sources'], ['de-tu-ca-common-error-sources'], 'NATIVE_READER_AND_DOWNSTREAM_FAMILY_CONTROL'],
  ['COLLECTION-ORIGINAL-BOTH-DUE', ['ct-owner-common-error-scope', 'eu-general-omission-delivery'], ['eu-general-omission-delivery'], 'FICTIONAL_NATIVE_PDF_UPLOAD']
].map(([suffix, assessment, packet, exercise_class]) => ['COMMON-ERROR-' + suffix, { assessment, packet, exercise_class }])
  .concat([[PERIOD_ITEM, { assessment: ['by-packet-reconciliation', 'cs-limitation-and-payment-history', 'el-collection-court-period'],
    packet: ['by-packet-reconciliation'], exercise_class: 'SCOPED_REPORTING_PERIOD_AND_INFORMATION_ONLY_COURT_CONTROL' }]])));

const FAMILY_PROOF = Object.freeze([
  { presentation_id: 'GENERAL-BUREAU-REPORT', sections: ['bx-all82-factual-verification', 'cw-common-error-rule-assessment', 'dl-general-caption-sources', 'du-column-reader-delivery'],
    exercise_classes: ['FICTIONAL_NATIVE_PDF_UPLOAD'], boundary: 'Source-linked supported captions and positioned cards; not every bureau export layout.' },
  { presentation_id: 'PR-01', sections: ['r-ca-factual-assessment', 'co-canada-upload-delivery', 'dq-ca-printed-account-fields'],
    exercise_classes: ['REAL_SAMPLE_READ', 'REAL_SAMPLE_HTTP_UPLOAD', 'CONTROLLED_LAYOUT_VARIATION'], boundary: 'Pinned Canadian Equifax specimen and measured captions; not a general Equifax Canada family admission.' },
  { presentation_id: 'FAM-TU-CA-CONSUMER', sections: ['w-ca-second-bureau-format', 'ce-tu-ca-account-material', 'de-tu-ca-common-error-sources', 'bu-gb-tu-ca-fields'],
    exercise_classes: ['REAL_SAMPLE_READ', 'DOWNSTREAM_CONTROLLED_STRUCTURAL_MODEL'], boundary: 'Real family admission remains enforced; synthetic layout variations are downstream proof, not bureau-issued PDF upload proof.' },
  { presentation_id: 'US-CONSUMER-DISCLOSURE', sections: ['p-us-consumer-format', 'df-us-common-error-reader', 'dn-us-dated-history', 'dw-us-history-completion'],
    exercise_classes: ['REAL_PUBLIC_SAMPLE_LOCAL_OCR', 'FICTIONAL_NATIVE_PDF_UPLOAD'], boundary: 'Supported US columns and own dated readable cells; unresolved month readings stay unresolved.' },
  { presentation_id: 'FAM-GB-EXP-CONSUMER', sections: ['s-gb-consumer-format', 'bu-gb-tu-ca-fields', 'dj-gb-reader-completion', 'dl-general-caption-sources'],
    exercise_classes: ['HISTORICAL_PUBLIC_SAMPLE_READ', 'DOWNSTREAM_CONTROLLED_STRUCTURAL_MODEL', 'FICTIONAL_NATIVE_GENERAL_UPLOAD'], boundary: 'Historical dedicated layout remains historical. Current bounded UK GENERAL field contract and four approved regional downloads do not certify every current dedicated bureau layout.' },
  { presentation_id: 'FAM-AU-EQX-CONSUMER', sections: ['l-au-format-family', 'di-au-reader-completion', 'dm-au-role-packet-evidence', 'dv-au-reference-delivery'],
    exercise_classes: ['REAL_PUBLIC_SAMPLE_READ', 'FICTIONAL_NATIVE_PDF_UPLOAD'], boundary: 'Own caption, type, reference, date and graphical repayment sources; report fields absent from accepted samples are not invented.' }
]);
const REQUIRED_SECTIONS = Object.freeze([...new Set([
  ...Object.values(CHECK_PROOF).flatMap(row => row.assessment.concat(row.packet)),
  ...FAMILY_PROOF.flatMap(row => row.sections), 'a-isolation', 'o-all82-infrastructure',
  'ap-accept-010-consistency', 'dc-consumer-violation-term', 'er-bureau-form-population',
  'es-filled-packet-business-letter', 'bw-browser-wizzard', 'dy-reader-date-delivery'
])]);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sameSet = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === expected.length && expected.every(value => actual.includes(value));
const cleanSection = section => Boolean(section && section.completed === true && section.failed === 0
  && Number.isInteger(section.passed) && section.passed > 0 && Array.isArray(section.skipped)
  && section.skipped.length === 0 && Array.isArray(section.failures) && section.failures.length === 0
  && section.section_exception === null);

function executionCustody(execution, regressionFile, sourceRoot) {
  const problems = [];
  const reject = text => problems.push(text);
  let sources = [];
  try {
    if (execution?.mode !== 'FULL_CURRENT_PRODUCT') reject('Complete current-product execution required.');
    if (execution?.totals?.failed !== 0 || execution?.totals?.skipped !== 0
      || !Array.isArray(execution?.unrun_sections) || execution.unrun_sections.length
      || !Array.isArray(execution?.source_drift) || execution.source_drift.length) reject('Failed, skipped, unrun or changed-source execution.');
    const inventory = currentInventory(sourceRoot);
    const sections = execution?.sections || [];
    if (!inventory.sectionFiles.length || !sameSet(sections.map(row => row.file), inventory.sectionFiles)
      || !sameSet(execution?.selected_sections, sections.map(row => row.id))
      || !sections.every(cleanSection)) reject('Incomplete, duplicate or invalid section execution inventory.');
    const totals = sections.reduce((sum, row) => ({ passed: sum.passed + row.passed,
      failed: sum.failed + row.failed, skipped: sum.skipped + (row.skipped?.length || 0) }), { passed: 0, failed: 0, skipped: 0 });
    if (JSON.stringify(totals) !== JSON.stringify(execution?.totals) || !(totals.passed > 0)) reject('Execution totals do not match completed sections.');
    sources = execution?.source_hashes || [];
    if (!sameSet(sources.map(row => String(row.file).replace(/\\/g, '/')), inventory.sources)) reject('Complete tested-source inventory required.');
    for (const source of sources) {
      const file = path.resolve(sourceRoot, source.file);
      if (!file.startsWith(path.resolve(sourceRoot) + path.sep) || !/^[a-f0-9]{64}$/i.test(source.sha256)
        || sha(fs.readFileSync(file)) !== source.sha256.toLowerCase()) reject('Tested source changed or unsafe: ' + source.file);
    }
    // PDF originals are not in the executable inventory. Verify their actual bytes,
    // not just the catalog file hash, before retaining original-form proof.
    const catalogFile = path.join(sourceRoot, 'accelerated-launch/service/bureau-forms/catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
    for (const form of catalog.forms) {
      const relative = 'accelerated-launch/service/bureau-forms/' + form.filename;
      const file = path.resolve(sourceRoot, relative);
      if (path.basename(form.filename) !== form.filename || sha(fs.readFileSync(file)) !== form.sha256) reject('Original bureau template changed: ' + form.id);
      sources = sources.concat([{ file: relative, sha256: form.sha256 }]);
    }
    if (JSON.stringify(JSON.parse(fs.readFileSync(regressionFile, 'utf8'))) !== JSON.stringify(execution)) reject('Frozen execution file differs from supplied proof.');
  } catch (error) { reject('Execution custody unavailable: ' + error.message); }
  return { passed: problems.length === 0, problems, sources };
}

function measuredScope(sections) {
  const problems = [];
  const need = (ok, label) => { if (!ok) problems.push(label); };
  const value = id => sections.get(id)?.evidence;
  const bx = value('bx-all82-factual-verification'), cw = value('cw-common-error-rule-assessment');
  need(bx?.regions_tested === 82 && bx.download_content_matched === 82 && bx.case_association_matched === 82
    && sameSet(bx.presentations, ['GENERAL-BUREAU-REPORT']), '82 own-source selected-content and case-associated native packet journeys.');
  need(cw?.ordinary_report_regions === 82 && cw.ordinary_report_checks_per_region === 6 && cw.statutory_gate === false,
    'Six shared sourced checks in all 82 regions without a mandatory statute.');
  need(value('cx-all82-required-report-data')?.regions_tested === 82, '82 sourced-blank versus unreadable omission controls.');
  const ct = value('ct-owner-common-error-scope');
  need(ct?.checklist === CHECKS.length && ct.jurisdictions === 82 && ct.retired_adapters > 0, 'Active checklist scope and retired-adapter suppression.');
  need(sameSet(value('o-all82-infrastructure')?.regions_exercised, allRegions()), 'Exact canonical all-82 region inventory.');
  need(value('dg-owned-reaging')?.jurisdictions === 82, 'Owned earlier/current re-aging assessment in all 82 regions.');
  const gb = value('dl-general-caption-sources')?.gb_field_contract;
  need(gb?.approved_downloads === 4 && gb.source_isolation === true
    && sameSet(gb.regions, ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS']), 'Four source-isolated UK GENERAL approved downloads.');
  const original = value('es-filled-packet-business-letter');
  need(original?.owned_actual_pdf_review === true && original.original_form_approval_digest === true
    && original.name_parts_not_guessed === true && original.ordinary_business_letter === true,
    'Actual original-form/letter PDF review and approved bytes.');
  const paired = value('eh-packet-report-exhibits');
  need(paired?.both_reaging_sources === true && paired.review_and_approval_binding === true
    && paired.selected_issue_sources_only === true && paired.automatically_included_relevant_pages === true,
    'Both owned re-aging source pages are automatically included and approval-bound.');
  const periods = value('by-packet-reconciliation')?.emitted_findings_reconciled;
  need(Array.isArray(periods) && periods.length > 0 && periods.every(row => row?.eligible === true && row.issues > 0
    && ['COLLECTION_REPORTING_PERIOD', 'TRADELINE_REPORTING_PERIOD'].includes(CHECKLIST_STATUTORY_SUPPORT[row.adapter_id])),
    'Only active checklist-related period adapters reach packets.');
  need(value('ap-accept-010-consistency')?.c5_clarification === true, 'Material clarification cannot replace report evidence.');
  const canada = value('w-ca-second-bureau-format')?.specimens_available;
  need(canada?.equifax_ca_pr_01 === true && canada.transunion_ca === true && canada.transunion_digest_verified === true,
    'Actual Canadian pinned and family specimens, with the TransUnion source digest verified.');
  const us = value('p-us-consumer-format');
  need(us?.presentation_id === 'US-CONSUMER-DISCLOSURE' && us.real_evidence?.skipped === false
    && us.real_evidence.accounts_read > 0 && us.real_evidence.evidenced_artifact_id === 'PUB-001',
    'Actual admitted US public specimen with its measured local OCR account readings.');
  const uk = value('s-gb-consumer-format');
  need(uk?.presentation_id === 'FAM-GB-EXP-CONSUMER' && uk.evidenced_artifact_id === 'PUB-009'
    && uk.real_evidence?.records_read > 0 && typeof uk.real_evidence.artifact_vintage === 'string',
    'Actual accepted historical UK specimen, without upgrading its currency claim.');
  const au = value('l-au-format-family')?.real_evidence;
  need(au?.skipped === false && au.records > 0 && /^[a-f0-9]{64}$/i.test(au.digest || ''),
    'Actual admitted Australian public specimen and measured record inventory.');
  return problems;
}

function omissionPositive(section, checkId) {
  const checks = section?.evidence?.checks;
  const row = Array.isArray(checks) && checks.find(item => item?.check_id === checkId);
  return Boolean(row && section.evidence.exercise_class === 'FICTIONAL_NATIVE_PDF_UPLOAD'
    && row.regions_tested === 82 && row.packet?.approved_downloads === 4
    && ['VIOLATION', 'PROBABLE_VIOLATION', 'POTENTIAL_VIOLATION'].includes(row.positive?.classification)
    && row.positive.consumer_label === 'VIOLATION' && row.positive.source_linked === true
    && row.positive.selected === true && row.positive.approved === true && row.positive.downloaded === true
    && row.benign?.issues === 0 && row.missing_source?.issues === 0
    && row.packet?.selected_content_matched === true && row.packet.unselected_content_absent === true);
}

function buildEvidence({ execution, regressionFile, sourceRoot = ROOT } = {}) {
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
  const custody = executionCustody(execution, regressionFile, sourceRoot);
  const sectionRows = Array.isArray(execution?.sections) ? execution.sections : [];
  const sections = new Map(sectionRows.filter(row => row && typeof row.id === 'string').map(section => [section.id, section]));
  const unavailable = REQUIRED_SECTIONS.filter(id => !cleanSection(sections.get(id)) || sections.get(id).file !== id + '.cjs');
  const scopeProblems = measuredScope(sections);
  const measured = custody.passed && !unavailable.length && !scopeProblems.length;
  const nativeRequired = new Set([OMISSION_UMBRELLA, 'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR',
    'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE', 'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE',
    'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE']);
  const proofFor = item => {
    const proof = CHECK_PROOF[item.check_id];
    const complete = measured && proof && proof.assessment.concat(proof.packet).every(id => cleanSection(sections.get(id)))
      && (!nativeRequired.has(item.check_id) || (item.check_id === OMISSION_UMBRELLA ? item.component_checks
        : [item.check_id]).every(id => omissionPositive(sections.get('eu-general-omission-delivery'), id)));
    return { ...item, status: complete ? 'SUPPORTED_AND_TESTED' : 'OPEN',
      assessment_sections: proof?.assessment || [], packet_sections: proof?.packet || [],
      packet_evidence_scope: 'Named sections prove the shared selected-evidence, review, approval and download mechanism. The native omission/original-collection rows additionally prove this exact check in four country packet paths.',
      exercise_class: proof?.exercise_class || 'UNMAPPED',
      boundary: item.scope === 'GROUPING_ONLY' ? 'Groups the three measured omission checks; never a second violation.'
        : item.scope === 'FACTUAL_REVIEW' ? 'Review observation only; not a classified breach or a free VIOLATION teaser.'
          : item.check_id === PERIOD_ITEM ? 'Applicable sourced reporting periods can support a dispute. Court deadlines remain INFORMATION, ineligible for packets, with no proactive bureau questions.'
            : 'Supported decisive report sources only; no claim that this rule runs on every layout.',
      reason: complete ? 'Named positive, benign/refusal and delivery sections completed with matching source custody.'
        : nativeRequired.has(item.check_id) ? 'Source-linked native positive/control and selected approved packet proof is incomplete.'
          : 'Complete source-matched execution and measured supported scope required.' };
  };
  const demonstrated = mapping.map(proofFor);
  const openRows = demonstrated.filter(row => row.status === 'OPEN').map(row => row.check_id);
  const configured = measured && openRows.length === 0;
  const families = FAMILY_PROOF.map(family => ({ ...family,
    status: measured && family.sections.every(id => cleanSection(sections.get(id))) ? 'SUPPORTED_AND_TESTED' : 'OPEN' }));
  const refs = custody.passed ? [{ file: path.relative(sourceRoot, regressionFile), sha256: sha(fs.readFileSync(regressionFile)) }] : [];
  const tests = REQUIRED_SECTIONS.map(id => ({ id, passed: measured && cleanSection(sections.get(id)),
    criteria: ['behavioral_coverage'], expected: 'Completed behavioral contract with its exact tested source.',
    measured: `${sections.get(id)?.passed || 0} passing assertions; exercise and source boundaries recorded separately.` }));
  tests.push(...demonstrated.map(row => ({ id: row.check_id, passed: row.status === 'SUPPORTED_AND_TESTED',
    criteria: ['check_mapping', 'executable_findings'], expected: row.boundary,
    measured: `${row.status}: ${row.assessment_sections.concat(row.packet_sections).join(', ')}` })));
  tests.push({ id: 'all82-measured-journeys', passed: measured, criteria: ['promise_inventory'],
    expected: '82 exact-content and case-associated packet journeys, six shared checks per region and sourced omissions.',
    measured: scopeProblems.length ? scopeProblems.join(' ') : '82/82 matched downloads and identities; six shared rules per region; 82 omission controls.' });
  tests.push({ id: 'material-questions', passed: measured, criteria: ['material_questions'],
    expected: 'No consumer answer replaces a decisive source or cures a printed omission.',
    measured: measured ? 'Source-bound ap-accept-010-consistency and native omission refusal controls completed.' : 'Current materiality proof unavailable.' });
  const hostedReason = 'Latest paid hosted original-form preview, approval and packet download remain pending. Local coverage acceptance does not establish hosted entitlement or production readiness.';
  const localCriterion = (passed, expected, measuredText) => ({ passed, expected, measured: measuredText, evidence_refs: refs });
  const evidence = {
    passed: false,
    measured_at: new Date().toISOString(),
    scope: 'Active version 1 common-error checklist only; 82 jurisdiction selections. Historical out-of-checklist statutory adapters are not active violation coverage.',
    identity: { build_id: process.env.CRP_BUILD_ID || null, served_build_id: null, local_only: true },
    implementation: { configured, status: configured ? 'IMPLEMENTED_AND_TESTED' : 'OPEN', scope: 'EXPLICIT_SUPPORTED_PATHS_ONLY',
      reason: configured ? 'Complete current source-bound behavioral acceptance for the supported checklist mechanisms, layout paths and all-82 delivery.'
        : custody.problems.concat(unavailable.map(id => 'Missing completed section: ' + id), scopeProblems,
          openRows.map(id => 'Open behavioral row: ' + id)).join(' '),
      source_files: custody.sources, evidence_refs: refs, tests },
    staging_verification: { status: 'PENDING', reason: hostedReason },
    counting_units: { note: 'One active checklist item; the omission umbrella is a grouping, not a second violation. Statutory adapters and citations are not active counting units.',
      selected_jurisdictions: regions.length, checklist_items: mapping.length,
      report_data_rule_checks: ruleIds.length, factual_review_checks: reviewIds.length,
      omission_groupings: 1, jurisdiction_specific_period_items: 1 },
    check_mapping: demonstrated,
    supported_family_paths: families,
    measured_all82: measured ? { jurisdictions: 82, own_content_downloads: 82, own_case_identity_downloads: 82,
      shared_checks_per_region: 6, sourced_omission_regions: 82 } : null,
    optional_statutory_support: Object.entries(CHECKLIST_STATUTORY_SUPPORT).map(([adapter_id, checklist_context]) => ({
      adapter_id, checklist_context, mandatory_gate: false
    })),
    presentation_capability: presentations,
    region_coverage: Object.fromEntries(regions.map((region) => [region, {
      checklist_items_available: mapping.map((item) => item.check_id),
      all_check_and_reader_paths_demonstrated: false,
      supported_shared_journey: measured ? 'IMPLEMENTED_AND_TESTED' : 'OPEN',
      note: 'Shared regional delivery is measured separately from each check and supported layout; no every-check/every-layout claim.'
    }])),
    executable_findings: { report_data_rule_checks: ruleIds, review_only_checks: reviewIds,
      demonstrated_all_checks_all_formats: false,
      note: 'A rule can produce a violation only after the particular report supplies decisive source-linked facts or a proved omission. No statute is a mandatory gate.' },
    material_questions: { status: 'NOT_A_GATE', note: 'No consumer answer substitutes for a required report field or establishes a common-error breach.' },
    behavioral_coverage: { status: configured ? 'SUPPORTED_SCOPE_ACCEPTED_LOCALLY' : 'OPEN', open_check_rows: openRows,
      note: 'Acceptance covers the explicit per-check and family paths above; unavailable values and unsupported layouts remain outside measured claims.' },
    remaining: { current_gb_dedicated_layout: 'Whole present-day dedicated UK bureau layouts are not certified; the bounded current GENERAL contract and four regional packet paths are separate supported outcomes.',
      unavailable_fields: 'Absent, ambiguous and unreadable fields never establish compliance or a breach. Refer to each supported reader boundary.',
      hosted_paid_journey: hostedReason, production_readiness: 'OPEN; live billing, capacity, restore/rollback, cutover and owner authorization remain independent.' },
    end_to_end_journey: { status: 'PENDING', note: hostedReason },
    criteria: {
      promise_inventory: localCriterion(measured, 'all 82 selections, source-associated downloads and active checklist scope', `${regions.length} selections; ${mapping.length} checklist items; measured delivery ${measured}`),
      check_mapping: localCriterion(configured, 'each listed item bound to inspected behavioral tests with its actual exercise class', `${demonstrated.length - openRows.length}/${mapping.length} supported checklist rows`),
      executable_findings: localCriterion(configured, 'source-proven positive and benign/refusal controls for the supported rule mechanisms', openRows.length ? 'Unproved rows: ' + openRows.join(', ') : 'Named current positive/control and packet sections passed; reviews and grouping remain distinct.'),
      material_questions: localCriterion(measured, 'questions cannot replace source facts or cure a report omission', measured ? 'Current materiality and omission controls passed.' : 'Current measured evidence unavailable.'),
      behavioral_coverage: localCriterion(configured, 'meaningful supported family, regional, packet, ownership and approval behavior', configured ? 'Supported per-check/family paths accepted; no every-layout claim.' : 'Incomplete supported-scope acceptance.'),
      end_to_end_journey: { passed: false, expected: 'current served-release paid original-form preview through approved download', measured: hostedReason, evidence_refs: [] }
    }
  };
  return evidence;
}

function main({ sourceRoot = ROOT, regressionFile = path.join(sourceRoot, REGRESSION),
  outputFile = path.join(sourceRoot, 'accelerated-launch/service/out/finding-coverage-evidence.json') } = {}) {
  let execution = null;
  try { execution = JSON.parse(fs.readFileSync(regressionFile, 'utf8')); } catch (_) { /* Missing proof stays OPEN. */ }
  const evidence = buildEvidence({ execution, regressionFile, sourceRoot });
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

if (require.main === module) {
  const evidence = main();
  process.stdout.write(`finding-coverage-evidence.json written (${evidence.implementation.status}; staging pending): ${evidence.counting_units.checklist_items} checklist items across ${evidence.counting_units.selected_jurisdictions} selections\n`);
}

module.exports = { main, buildEvidence, executionCustody, allRegions, mappingFor, CHECK_PROOF, FAMILY_PROOF, REQUIRED_SECTIONS };
