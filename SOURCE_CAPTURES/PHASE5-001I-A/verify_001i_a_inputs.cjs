'use strict';
/**
 * verify_001i_a_inputs.cjs — verify every input and prerequisite PHASE5-001I-A relies on, from its own source,
 * before this order claims anything about it.
 *
 * Writes SOURCE_CAPTURES\PHASE5-001I-A\input_verification.json. Read-only outside that directory.
 */

const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001I-A');
const LEGACY = 'C:\\Users\\webbd\\crp-credit-app';
const checks = [];
const failures = [];
function check(id, claim, ok, detail) {
  checks.push({ id, claim, passed: !!ok, detail: String(detail) });
  if (!ok) failures.push(`${id} ${claim} — ${detail}`);
}
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const text = (file) => fs.readFileSync(file, 'utf8');

const register = read('SOURCE_CAPTURES\\PROD-003\\report_representation_register.json');
const crosswalk = read('SOURCE_CAPTURES\\PROD-003\\crosswalk.json');
const gates003 = read('SOURCE_CAPTURES\\PROD-003\\gate_prerequisites.json');
const gates001O = read('SOURCE_CAPTURES\\PHASE5-001O\\gate_reassessment_001o.json');
const admitted = read('SOURCE_CAPTURES\\PHASE5-001O\\admitted_artifacts.json');
const ledger = read('SOURCE_CAPTURES\\PHASE5-001O\\source_id_coverage_ledger.json');
const amendment = read('SOURCE_CAPTURES\\PHASE5-001I-A\\amendment_application_result.json');
const prod003Validation = read('SOURCE_CAPTURES\\PROD-003\\validation_results.json');
const prod002Custody = read('SOURCE_CAPTURES\\PROD-002\\file_custody_manifest.json');
const unitConstants = require('../../internal-validation/ca-ns-last-payment-six-year/constants.cjs');

// ------------------------------------------------------------------ 1. the evidenced presentation
const presentation = register.presentations.find((p) => p.presentation_id === register.selected_presentation);
const specimenPath = presentation.absolute_path_outside_this_repository;
check('I-01', 'the selected presentation PR-01 is recorded by PROD-003 and still present at its recorded path', fs.existsSync(specimenPath), 'path read from the PROD-003 register');
check('I-02', 'the evidenced presentation digest matches the register', sha(specimenPath) === presentation.sha256, `${presentation.sha256} (recorded)`);
const secondarySpecimen = register.presentations.find((p) => p.presentation_id !== register.selected_presentation);
check('I-03', 'the secondary specimen PR-02 is unchanged', sha(secondarySpecimen.absolute_path_outside_this_repository) === secondarySpecimen.sha256, 'PR-02 digest, path read from the register');
check('I-04', 'the specimen is read in place from outside this repository', /crp-credit-app/.test(specimenPath), 'nothing is copied into this repository');

// ------------------------------------------------------------------ 2. the corpus and the ledger row
const corpusRelative = unitConstants.UNIT.admitted_source_artifact;
const corpusEntry = admitted.artifacts.find((a) => a.relative_path === corpusRelative);
check('I-05', 'the admitted corpus artifact carrying the rule is unchanged', !!corpusEntry && sha(path.join(LEGACY, corpusRelative)) === corpusEntry.recorded_sha256, `${corpusEntry ? corpusEntry.recorded_sha256 : 'MISSING'}`);
const row = ledger.rows.find((r) => r.source_entry_id === 'CRP-LSRC-0354');
check('I-06', 'the ledger row CRP-LSRC-0354 records the exact CA-NS association', !!row && row.established_jurisdiction_associations.canonical_jurisdiction_status === 'EXACT' && row.established_jurisdiction_associations.canonical_region_code === 'CA-NS', row ? row.established_jurisdiction_associations.canonical_jurisdiction_status : 'row missing');
check('I-07', 'the ledger row records the same legacy rule id this unit implements', !!row && row.existing_operational_mapping.legacy_rule_references.some((r) => r.ruleId === 'ca-ns.cra.s10_3_c.debt_retention_6y'), 'ca-ns.cra.s10_3_c.debt_retention_6y');
check('I-08', 'the crosswalk selected this unit and records it as the first limb only', crosswalk.selected.rule_unit === 'CA-NS-CRA-S10-3-C-LIMB-1', crosswalk.selected.rule_unit);

// ------------------------------------------------------------------ 3. the enumeration and the gate state
check('I-09', 'CRP-JURISDICTION-ENUM-1 enumerates CA / CA-NS', /\| `CA` \| `CA-NS` \| `CA-NS` \| Nova Scotia \|/.test(text(path.join(ROOT, 'CRP_JURISDICTION_ENUMERATION.md'))), 'the explicit selection this unit requires is an enumerated jurisdiction');
check('I-10', 'Gate 5.3 is not met and is not treated as passed', !/^MET/.test(gates001O.gate_status['5.3'].state) && /exactly one candidate on exactly one presentation/i.test(gates003.prerequisite_verification.find((g) => g.id === 'G-5.3').PROD_003_effect), `${gates001O.gate_status['5.3'].state}, and the recorded claim is the narrow one`);
check('I-11', 'Gate 5.4 has not started and no governed rule is admitted', /NOT_STARTED/.test(gates001O.gate_status['5.4'].state) && gates003.measured_now.admitted_governed_legal_rules === 0, `${gates001O.gate_status['5.4'].state}, admitted rules ${gates003.measured_now.admitted_governed_legal_rules}`);
check('I-12', 'no permitted legal finding exists', gates003.measured_now.permitted_legal_findings === 0, String(gates003.measured_now.permitted_legal_findings));


// ------------------------------------------------------------------ 4. the amendment and the narrative repair
const buildPlanPath = path.join(ROOT, 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md');
const buildPlan = text(buildPlanPath);
check('I-13', 'the owner-authorized internal-validation carve-out is recorded in the build plan', buildPlan.includes('Owner-authorized internal-validation carve-out (PHASE5-001I-A)') && buildPlan.includes('| 2026-09-30 | PHASE5-001I-A |'), 'section 3 carve-out and section 8 history row');
check('I-14', 'section 4 item 5 excludes the carve-out from the admitted specification and implementation', buildPlan.includes('the section 3 internal-validation carve-out is not that specification or implementation'), 'section 4 item 5 qualified');
check('I-15', 'the amended build plan keeps its LF line endings and matches the amendment record', !/\r\n/.test(buildPlan) && amendment.digest_after === sha(buildPlanPath), amendment.document_state);
const prod003Narrative = text(path.join(ROOT, 'CRP_PROD_003_FIRST_REPORT_REPRESENTATION_AND_RULE_CROSSWALK.md'));
check('I-16', 'the PROD-003 narrative repair placed its gate rows and its claim where they belong', prod003Narrative.includes('| 5.6 | not started | no suite, no replay |\r\n| 5.7 | not reached | 0 admitted governed rules, 0 permitted findings, no finding class created |')
  && prod003Narrative.includes('No gate is declared passed as a\r\nwhole anywhere in this document.\r\n\r\n## 11.')
  && prod003Narrative.includes('## 16. Closing summary')
  && prod003Narrative.trimEnd().endsWith('exclusions (§11). Not executed here.'), 'the 5.7 row and the gate-claim sentence returned to section 10 and the closing summary closes the document');
check('I-17', 'the repaired narrative keeps CRLF line endings', prod003Narrative.split('\n').every((l, i, a) => i === a.length - 1 || l.endsWith('\r')), 'CRLF preserved');

// ------------------------------------------------------------------ 5. the environment and the inherited state
check('I-18', 'the named extraction and structure methods are present and read the evidenced document', /Pages:\s+22/.test(execFileSync('pdfinfo', [specimenPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })) && execFileSync('pdftotext', ['-f', '16', '-l', '16', '-layout', specimenPath, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).includes('Last Payment Date'), 'poppler pdfinfo and pdftotext read the specimen');
check('I-19', 'the PROD-003 chain was recorded green before this order changed anything', /ALL PROD-003 VALIDATION PASSED/.test(String(prod003Validation.verdict)), String(prod003Validation.verdict));
const generatedFile = path.join(ROOT, 'consumer-wizard', 'dist', 'jurisdiction-data.js');
const generatedEntry = prod002Custody.files.find((f) => f.relative_path_from_workspace === 'consumer-wizard\\dist\\jurisdiction-data.js');
const generated = text(generatedFile);
check('I-20', 'the consumer application data is unchanged and still reports report checking as unavailable', sha(generatedFile) === generatedEntry.sha256 && /"available": false/.test(generated), 'generated jurisdiction data byte-identical to PROD-002 custody, and unavailable');
check('I-21', 'the unit requires the explicit authorized selection and refuses anything else', unitConstants.UNIT.jurisdiction.selection_is_mandatory === true && unitConstants.UNIT.jurisdiction.region_code === 'CA-NS', 'CA / CA-NS mandatory');
check('I-22', 'the unit carries no finding authority and no consumer-visible surface', unitConstants.PRESERVED_CLASSIFICATION.effective_ceiling_for_this_unit === 'OBSERVATION_CLASS_ONLY_UNTIL_THE_OWNER_DECIDES_AT_GATE_5_4' && unitConstants.PRESERVED_CLASSIFICATION.legacy_permitted_conclusion === 'observation', 'observation class only');

const document = {
  artifact: 'input_verification.json',
  work_order: 'PHASE5-001I-A',
  created_utc: new Date().toISOString().slice(0, 10),
  purpose: 'verify every input and prerequisite this order relies on, from its own source, before the order claims anything about it',
  checks,
  check_count: checks.length,
  failures,
  verdict: failures.length === 0 ? 'ALL PHASE5-001I-A INPUTS AND PREREQUISITES VERIFIED' : 'INPUT VERIFICATION FAILED — see failures'
};
fs.writeFileSync(path.join(OUT, 'input_verification.json'), JSON.stringify(document, null, 2) + '\n', 'utf8');
for (const c of checks) console.log(`${c.passed ? 'PASS' : 'FAIL'}  ${c.id} ${c.claim} — ${c.detail}`);
console.log(`${checks.length} checks, ${failures.length} failures`);
console.log(document.verdict);
process.exitCode = failures.length === 0 ? 0 : 1;
