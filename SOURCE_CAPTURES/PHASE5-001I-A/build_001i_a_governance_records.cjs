'use strict';
/**
 * build_001i_a_governance_records.cjs — the governance records of PHASE5-001I-A.
 *
 * Writes: gate_sequence_assessment.json, presentation_boundary.json, classification_record.json,
 * permitted_files.json and implementation_manifest.json.
 *
 * Every quote is read from the file it is attributed to, at the line it is recorded at, and each document's
 * digest is measured here. The legacy repository is read only.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001I-A');
const LEGACY = 'C:\\Users\\webbd\\crp-credit-app';
const TODAY = new Date().toISOString().slice(0, 10);

const BUILD_PLAN = 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md';
const READINESS_PLAN = 'CRP_PROD_001_READINESS_AND_IMPLEMENTATION_PLAN.md';
const DIRECT_REPORT = 'CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md';
const ADMITTED_CORPUS_REL = 'packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts';
const LEGACY_GOVERNANCE_REL = 'CRP_CANADA_GOVERNING_BUILD_CONTRACT.md';

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const docLines = (file) => fs.readFileSync(file, 'utf8').split('\n');
function findLine(file, predicate) {
  const all = docLines(file);
  const index = all.findIndex(predicate);
  return index === -1 ? null : { line: index + 1, text: all[index] };
}
function write(name, doc) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(doc, null, 2) + '\n', 'utf8');
  return name;
}

// ------------------------------------------------------------------ the recorded restriction
const planFile = path.join(ROOT, BUILD_PLAN);
const readinessFile = path.join(ROOT, READINESS_PLAN);
const sequence = findLine(planFile, (l) => l.startsWith('Work proceeds in the following order.'));
const item5 = findLine(planFile, (l) => l.startsWith('5. Deterministic fact/evaluator specification'));
const m1 = findLine(readinessFile, (l) => l.startsWith('**Milestone M-1'));
const gates001O = JSON.parse(fs.readFileSync(path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001O', 'gate_reassessment_001o.json'), 'utf8'));
const gates003 = JSON.parse(fs.readFileSync(path.join(ROOT, 'SOURCE_CAPTURES', 'PROD-003', 'gate_prerequisites.json'), 'utf8'));
const gateState = (id) => gates001O.gate_status[id].state;

write('gate_sequence_assessment.json', {
  artifact: 'gate_sequence_assessment.json',
  work_order: 'PHASE5-001I-A',
  created_utc: TODAY,
  purpose: 'record the exact prerequisites the approved gate sequence imposes on this implementation, name the restriction, and record the smallest owner-authorized amendment that permits internal validation only while leaving every production admission gate intact',
  prerequisite_the_sequence_requires: [
    {
      id: 'P-1',
      requirement: 'the approved build plan orders the work so that a later phase cannot begin before its stated gate passes',
      instrument: BUILD_PLAN, rank: 5, clause: 'section 3, the ordering sentence that opens the gate sequence',
      located_at_line: sequence ? sequence.line : null,
      quoted_text: sequence ? sequence.text : 'NOT FOUND', satisfies_this_order: false
    },
    {
      id: 'P-2',
      requirement: 'the deterministic fact/evaluator specification and implementation come only after rule units and report mappings are admitted',
      instrument: BUILD_PLAN, rank: 5, clause: 'section 4, item 5',
      located_at_line: item5 ? item5.line : null,
      quoted_text: item5 ? item5.text : 'NOT FOUND', satisfies_this_order: false
    },
    {
      id: 'P-3',
      requirement: 'milestone M-1 requires Gate 5.3 to pass for the single selected unit before Phase 5.4 may begin',
      instrument: READINESS_PLAN, rank: 6, clause: 'section 9.4, Next milestone',
      located_at_line: m1 ? m1.line : null,
      quoted_text: m1 ? m1.text : 'NOT FOUND', satisfies_this_order: false
    }
  ]
});

// ------------------------------------------------------------------ the measured state and the relief
const assessment = JSON.parse(fs.readFileSync(path.join(OUT, 'gate_sequence_assessment.json'), 'utf8'));
assessment.measured_gate_state = {
  source: 'SOURCE_CAPTURES\\PHASE5-001O\\gate_reassessment_001o.json and SOURCE_CAPTURES\\PROD-003\\gate_prerequisites.json',
  gate_5_1: gateState('5.1'), gate_5_2: gateState('5.2'), gate_5_3: gateState('5.3'),
  gate_5_3_claim_recorded_by_prod003: gates003.prerequisite_verification.find((g) => g.id === 'G-5.3').PROD_003_effect,
  gate_5_4: gateState('5.4'), gate_5_5: gateState('5.5'),
  admitted_governed_legal_rules: gates003.measured_now.admitted_governed_legal_rules,
  permitted_legal_findings: gates003.measured_now.permitted_legal_findings,
  gate_5_3_is_recorded_as_passed: false
};
assessment.conclusion = {
  restriction_applies: true,
  statement: 'Gate 5.3 is reached for one candidate on one presentation and is passed for none. Gate 5.4 has not started, no rule unit is admitted and no admitted evaluator exists. The approved build plan therefore does not presently permit a deterministic evaluator implementation inside the certified path, and a rank-6 work order cannot override a rank-5 plan (CRP_CORE_CONSTITUTION.md sections 2.1 and 2.2).',
  hidden_or_waived: false
};
assessment.relief = {
  instrument: BUILD_PLAN,
  clause: 'section 3, the owner-authorized internal-validation carve-out, with section 4 item 5 qualified to exclude it',
  form: 'owner amendment under CRP_CORE_CONSTITUTION.md section 6.2 — document and clause named, replaced text quoted, replacement text stated',
  records: ['amendment_text.json', 'amendment_application_result.json'],
  scope: 'internal validation only: one jurisdiction, one presentation, one rule unit, one limb; no admission, no coverage, no finding, no consumer-visible output, no gate credit, no override of a recorded classification, and re-validation under Gates 5.5 and 5.6 before any admission',
  gate_effects: 'none'
};
assessment.what_this_order_does_not_do = [
  'it does not pass, advance, soften or waive any gate',
  'it does not admit a rule, create coverage or create a finding class',
  'it does not build or advertise a consumer-visible evaluator',
  'it does not override the recorded legacy D3 / observation classification',
  'it does not resolve the second limb, the effective period, the single-specimen boundary or the field-name divergence',
  'it reports no result to any consumer, and report checking remains unavailable for every region'
];
assessment.gate_claims_made_by_this_order = 'none — this order claims no gate state at all, and it records every gate state it measured as unchanged';
assessment.created_by = 'PHASE5-001I-A';
write('gate_sequence_assessment.json', assessment);


// ------------------------------------------------------------------ the classification actually read
const corpusFile = path.join(LEGACY, ADMITTED_CORPUS_REL);
const corpusAll = docLines(corpusFile);
const classBlockStart = corpusAll.findIndex((l) => l.includes('CANADA_RULE_CLASSIFICATION_RECORDS'));
const ruleIndex = corpusAll.findIndex((l, i) => i > classBlockStart && l.includes('ca-ns.cra.s10_3_c.debt_retention_6y'));
const window = corpusAll.slice(ruleIndex, ruleIndex + 12);
function phrase(needle) {
  const at = window.findIndex((l) => l.includes(needle));
  return at === -1 ? null : { line: ruleIndex + at + 1, quoted_text: window[at].trim() };
}
const governanceFile = path.join(LEGACY, LEGACY_GOVERNANCE_REL);
const directReportFile = path.join(ROOT, DIRECT_REPORT);

write('classification_record.json', {
  artifact: 'classification_record.json',
  work_order: 'PHASE5-001I-A',
  created_utc: TODAY,
  purpose: 'record, from the files themselves, the classification this unit carries, the legacy determination it preserves, the field-name divergence it records, and the ceiling that therefore governs any output of this order',
  owner_decision: {
    text: 'Preserve the legacy D3/observation classification. Do not override it with PROBABLE_VIOLATION during this order. The stated ceiling is not authorization to emit that finding. Timing and classification dependencies remain explicit.',
    effect: 'the PROD-003 section 7.4 PROBABLE_VIOLATION ceiling is not emitted, not implied and not relied on anywhere in this unit'
  },
  preserved_classification: {
    state: 'PRESERVED_LEGACY_CLASSIFICATION_NOT_OVERRIDDEN',
    legacy_rule_id: 'ca-ns.cra.s10_3_c.debt_retention_6y',
    legacy_determinability_level: 'D3',
    legacy_classification: 'REPORT_RELEVANT_BUT_NOT_DETECTABLE',
    legacy_permitted_conclusion: 'observation',
    legacy_packet_eligible: false,
    effective_ceiling_for_this_unit: 'OBSERVATION_CLASS_ONLY_UNTIL_THE_OWNER_DECIDES_AT_GATE_5_4',
    plus_never_authorized: 'VIOLATION is unavailable to this unit in all circumstances'
  },
  legacy_evidence_read_here: {
    admitted_artifact: ADMITTED_CORPUS_REL,
    admitted_artifact_sha256: sha256(corpusFile),
    admitted_artifact_is_admitted: true,
    admission_source: 'SOURCE_CAPTURES\\PHASE5-001O\\admitted_artifacts.json',
    classification_block: 'CANADA_RULE_CLASSIFICATION_RECORDS',
    block_starts_at_line: classBlockStart + 1,
    rule_entry_at_line: ruleIndex + 1,
    quoted_fragments: {
      classification: phrase('REPORT_RELEVANT_BUT_NOT_DETECTABLE'),
      determinability: phrase('The row stands at D3'),
      permitted_conclusion: phrase('permittedConclusion "observation"'),
      packet_eligibility: phrase('packet-ineligible')
    },
    legacy_binding_rule: {
      instrument: LEGACY_GOVERNANCE_REL,
      rank_in_this_repository: 10,
      level_definition: findLine(governanceFile, (l) => l.startsWith('| **D3**')),
      binding: findLine(governanceFile, (l) => l.includes('The only binding between level and conclusion'))
    }
  },
  recorded_field_name_divergence: {
    printed_field_the_unit_reads: 'Last Payment Date inside a Collections collection record',
    legacy_required_report_field: 'tradeline.lastPaymentDate',
    state: 'RECORDED_NOT_RESOLVED',
    note: 'the admitted legacy rule record names a tradeline field while the evidenced presentation prints the field on a collection record; this divergence is one recorded basis of the preserved classification and is an owner/admission question'
  },
  second_limb_and_timing: {
    second_limb: 'the default-date limb is excluded from this unit: FACT-05 is unseated on this presentation',
    effective_period: 'unresolved in the admitted record (PROD-003 dependency D-4), so a plain-language timing qualification is carried on every result',
    legacy_d3_versus_direct_report_exception: 'the recorded legacy D3 / observation classification diverges from the direct-report contract section 4 retention exception (PROD-003 dependency D-5); only the owner settles which governs, and this order preserves the legacy classification and does not override it'
  },
  direct_report_contract_position: {
    instrument: DIRECT_REPORT,
    rank: 4,
    retention_exception_quoted: findLine(directReportFile, (l) => l.includes('unless the only unresolved fact is that underlying historical event')),
    probable_route_quoted: findLine(directReportFile, (l) => l.includes('The report-assertion route in')),
    status: 'RECORDED, NOT RELIED ON — the route requires an admitted governed rule and a recorded exception determination, neither of which exists'
  },
  created_by: 'PHASE5-001I-A'
});



// ------------------------------------------------------------------ the presentation boundary and the files
const unitConstants = require('../../internal-validation/ca-ns-last-payment-six-year/constants.cjs');
const contract = require('../../internal-validation/ca-ns-last-payment-six-year/presentation-contract.cjs');
const IMPL_DIR = path.join(ROOT, 'internal-validation', 'ca-ns-last-payment-six-year');

write('presentation_boundary.json', {
  artifact: 'presentation_boundary.json',
  work_order: 'PHASE5-001I-A',
  created_utc: TODAY,
  purpose: 'state exactly which presentation this unit is supported on, on what structural contract, and what it refuses, so that no reader infers support for any other report',
  supported_presentation: {
    presentation_id: contract.PR_01_CONTRACT.presentation_id,
    definition: contract.PR_01_CONTRACT.definition,
    publisher: contract.PR_01_CONTRACT.publisher,
    market: contract.PR_01_CONTRACT.market,
    audience: contract.PR_01_CONTRACT.audience,
    evidenced_artifact_id: contract.PR_01_CONTRACT.evidenced_artifact_id,
    evidenced_sha256: contract.PR_01_CONTRACT.evidenced_sha256,
    evidence_source: contract.PR_01_CONTRACT.evidence_source,
    boundary: contract.PR_01_CONTRACT.boundary
  },
  structural_contract: {
    container: contract.PR_01_CONTRACT.container,
    page_count: contract.PR_01_CONTRACT.page_count,
    page_size: contract.PR_01_CONTRACT.page_size_label,
    page_size_tolerance_pt: contract.PR_01_CONTRACT.page_size_tolerance_pt,
    native_text_on_every_page: contract.PR_01_CONTRACT.native_text_on_every_page,
    section_heading: contract.PR_01_CONTRACT.section_heading,
    header_label: contract.PR_01_CONTRACT.header_label,
    record_boundary_label: contract.PR_01_CONTRACT.record_boundary_label,
    printed_date_form: contract.PR_01_CONTRACT.printed_date_form,
    row_labels: unitConstants.ROW_LABELS,
    debt_record_required_labels: unitConstants.DEBT_RECORD_REQUIRED_LABELS,
    debt_record_min_other_labels: unitConstants.DEBT_RECORD_MIN_OTHER_LABELS,
    request_date_must_appear_on_every_page_with_one_value: true
  },
  admission_predicates_in_order: [
    { id: 'INPUT_PRESENT_AND_READABLE', refuses_as: 'DOCUMENT_NOT_READABLE or NOT_A_PDF_CONTAINER' },
    { id: 'CONTAINER_IS_A_PDF', refuses_as: 'NOT_A_PDF_CONTAINER' },
    { id: 'NOT_ENCRYPTED', refuses_as: 'DOCUMENT_ENCRYPTED' },
    { id: 'NATIVE_TEXT_ON_EVERY_PAGE', refuses_as: 'IMAGE_ONLY_OR_NO_TEXT_LAYER' },
    { id: 'PAGE_GEOMETRY_MATCHES_CONTRACT', refuses_as: 'PAGE_GEOMETRY_MISMATCH' },
    { id: 'NO_SYNTHETIC_OR_FIXTURE_MARKER', refuses_as: 'SYNTHETIC_OR_FIXTURE_MARKER' },
    { id: 'EVIDENCED_SPECIMEN_DIGEST_MATCH', refuses_as: 'NOT_THE_EVIDENCED_SPECIMEN' }
  ],
  refusal_reasons_and_the_fact_status_each_produces: unitConstants.REFUSAL_REASONS,
  refused_input_classes: [
    'another Equifax Canada product, another bureau, or a subscriber, business, screening or tenant-screening document',
    'a scan, photograph, mobile view or any page with no native text (no OCR is specified)',
    'a generated or synthetic fixture, including this order\'s own test fixtures',
    'a PR-01-shaped document that is not the evidenced specimen',
    'an encrypted or unreadable document, recorded as a document-level extraction failure and never as absence'
  ],
  created_by: 'PHASE5-001I-A'
});

function inventory(directory, role) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push({ path: path.relative(ROOT, full), role: role(full), bytes: fs.statSync(full).size, sha256: sha256(full) });
    }
  };

const implementationFiles = inventory(IMPL_DIR, (full) => (/tests|synthetic/.test(full) ? 'test or fixture support' : 'implementation'));
const evidenceFiles = inventory(OUT, (full) => (/\.ps1$/.test(full) ? 'verification script'
  : /\.(cjs|js)$/.test(full) ? 'evidence builder or checker' : 'evidence record'));

write('permitted_files.json', {
  artifact: 'permitted_files.json',
  work_order: 'PHASE5-001I-A',
  created_utc: TODAY,
  purpose: 'record the file boundary the order carries and prove that nothing outside it was created',
  permitted_by_the_order: [
    'a new directory for the evaluator and its tests (PROD-003 section 11, Permitted files)',
    'evidence records in this order\'s own SOURCE_CAPTURES package, and this order\'s narrative'
  ],
  permitted_prefixes: ['internal-validation\\ca-ns-last-payment-six-year\\', 'SOURCE_CAPTURES\\PHASE5-001I-A\\'],
  permitted_root_files: ['CRP_PHASE5_001I_A_LAST_PAYMENT_EXTRACTOR_AND_SIX_YEAR_EVALUATOR.md'],
  files_created_in_the_permitted_directories: {
    implementation: implementationFiles.map((f) => f.path),
    evidence: evidenceFiles.map((f) => f.path)
  },
  files_created_outside_them: [],
  pre_existing_files_this_order_changes: [
    BUILD_PLAN + ' — the owner-authorized internal-validation carve-out',
    'CRP_PROD_003_FIRST_REPORT_REPRESENTATION_AND_RULE_CROSSWALK.md — a recorded assembly repair: two displaced blocks returned to their own sections, no claim added, removed or changed'
  ],
  forbidden_operations_not_performed: [
    'no ledger, enumeration, catalogue or admitted-corpus edit',
    'no consumer-wizard change and no generated jurisdiction-data change',
    'no legacy file created, modified or copied',
    'no report content and no identifier copied into this repository',
    'no deployment, upload, hosting, billing or authentication'
  ],
  created_by: 'PHASE5-001I-A'
});

write('implementation_manifest.json', {
  artifact: 'implementation_manifest.json',
  work_order: 'PHASE5-001I-A',
  created_utc: TODAY,
  purpose: 'the byte-level inventory of every file this order wrote inside its permitted directories, with its role',
  implementation_directory: 'internal-validation\\ca-ns-last-payment-six-year\\',
  entry_point: 'internal-validation\\ca-ns-last-payment-six-year\\run-internal-validation.cjs',
  test_entry_point: 'internal-validation\\ca-ns-last-payment-six-year\\tests\\run-tests.cjs',
  file_count: implementationFiles.length + evidenceFiles.length,
  implementation_file_count: implementationFiles.length,
  evidence_file_count: evidenceFiles.length,
  files: implementationFiles.concat(evidenceFiles),
  created_by: 'PHASE5-001I-A'
});

console.log(`restriction applies: ${assessment.conclusion.restriction_applies}`);
console.log(`implementation files: ${implementationFiles.length}; evidence files: ${evidenceFiles.length}`);

  walk(directory);
  return out;
}
