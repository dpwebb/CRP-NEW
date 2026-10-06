'use strict';
/**
 * check_001i_a_narrative.cjs — checks on this order's narrative.
 *
 * Asserts that every fact the narrative claims is present in the evidence, and that no forbidden claim
 * appears anywhere in it. Writes SOURCE_CAPTURES\PHASE5-001I-A\narrative_check.json.
 */

const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001I-A');
const NARRATIVE = path.join(ROOT, 'CRP_PHASE5_001I_A_LAST_PAYMENT_EXTRACTOR_AND_SIX_YEAR_EVALUATOR.md');
const text = fs.readFileSync(NARRATIVE, 'utf8');
const read = (name) => JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8'));

const checks = [];
const failures = [];
function check(name, ok, detail) {
  checks.push({ check: name, passed: !!ok, detail: String(detail === undefined ? '' : detail) });
  if (!ok) failures.push(`${name} — ${detail}`);
}

const tests = read('test_results_001i_a.json');
const extraction = read('extraction_results.json');
const evaluation = read('evaluation_results.json');
const inputs = read('input_verification.json');
const identifiers = read('identifier_scan.json');
const gates = read('gate_sequence_assessment.json');
const amendment = read('amendment_application_result.json');
const preservation = read('preservation_and_change_record.json');
const boundary = read('presentation_boundary.json');
const classification = read('classification_record.json');

check('narrative exists', fs.existsSync(NARRATIVE), path.basename(NARRATIVE));
check('narrative has substantive length', text.length > 12000, `${text.length} characters`);
for (const section of ['## The answer in one table', '## 1. What the owner authorized', '## 2. The prerequisite', '## 3. The owner-authorized amendment', '## 4. The exact supported presentation boundary', '## 5. What was implemented', '## 6. The two facts', '## 7. The deterministic comparison', '## 8. The classification', '## 9. The tests', '## 10. Privacy, custody and preservation', '## 11. The verification run', '## 12. Remaining admission dependencies', '## 13. Boundaries']) {
  check(`narrative section ${section}`, text.includes(section), text.includes(section) ? 'present' : 'missing');
}

check('narrative names the unit, the jurisdiction and the presentation', /CA-NS-CRA-S10-3-C-LIMB-1/.test(text) && /`CA` \/ `CA-NS`/.test(text) && /`PR-01`/.test(text), 'unit, CA/CA-NS, PR-01');
check('narrative records the evidenced digest', text.includes(boundary.supported_presentation.evidenced_sha256.slice(0, 8)), boundary.supported_presentation.evidenced_sha256);
check('narrative records the recorded restriction', text.includes('gate_sequence_assessment.json') && text.includes('only after rule units and report mappings are admitted'), 'restriction recorded with its clause');
check('narrative records that no gate is passed', /no gate is passed/i.test(text) && /^none/.test(gates.gate_claims_made_by_this_order), gates.gate_claims_made_by_this_order);
check('narrative records the amendment and its limits', text.includes('internal-validation carve-out') && amendment.document_state === 'OWNER_AUTHORIZED_INTERNAL_VALIDATION_CARVE_OUT_RECORDED_IN_THE_DOCUMENT', amendment.document_state);
check('narrative records the reproduced arithmetic', text.includes('1,919') && text.includes('2,191') && evaluation.reproduced_from_prod003.verdict === 'REPRODUCED', evaluation.reproduced_from_prod003.verdict);
check('narrative records the outcome on the specimen', extraction.last_payment_fact_summary.status === 'RESOLVED' && text.includes('PERIOD_NOT_EXCEEDED'), extraction.last_payment_fact_summary.status);
check('narrative records the preserved classification and the ceiling', /preserv/i.test(text) && text.includes('OBSERVATION_CLASS_ONLY_UNTIL_THE_OWNER_DECIDES_AT_GATE_5_4') && classification.preserved_classification.legacy_determinability_level === 'D3', 'D3 / observation preserved');
check('narrative states that PERIOD_EXCEEDED alone is not a finding', /`PERIOD_EXCEEDED` alone is not a legal finding/.test(text), 'the comparison is not a finding');
check('narrative records the test count and the verdict', text.includes(`${tests.test_count} tests, 0 failures`) && tests.failures === 0, `${tests.test_count} tests`);
check('narrative records the refusal boundary', /NOT_THE_EVIDENCED_SPECIMEN/.test(text) && /one specimen does not\s+establish support/i.test(text), 'one specimen, not a report class');
check('narrative records the identifier scan', text.includes('identifier_scan.json') && identifiers.finding_count === 0, `${identifiers.files_scanned} files scanned, ${identifiers.finding_count} findings`);
check('narrative records preservation and the date-scoped PROD-003 reading', /PRESERVATION HELD/.test(text) && /REVIEW REQUIRED/.test(text) && /^PRESERVATION HELD/.test(preservation.verdict), 'preservation held and the expected reading recorded');
check('narrative records the PROD-003 narrative repair', /narrative\s+repair/i.test(text) && fs.existsSync(path.join(ROOT, 'CRP_PROD_003_FIRST_REPORT_REPRESENTATION_AND_RULE_CROSSWALK.md')), 'the repair is disclosed');
check('narrative records the input verification', inputs.failures.length === 0 && text.includes('input_verification.json'), `${inputs.check_count} checks`);
check('narrative records that report checking remains unavailable', /not yet\s+available/i.test(text), 'consumer surface unchanged');
check('narrative names the remaining dependencies and the next work order', /## 12\. Remaining admission dependencies/.test(text) && /next bounded work order/i.test(text), 'dependencies and next order');


const forbidden = [
  { id: 'claims a gate passed', pattern: /Gate 5\.[3-7] (has )?(passed|is met|now passes)/i },
  { id: 'claims report checking is available', pattern: /report checking is (now )?available/i },
  { id: 'claims a finding was emitted', pattern: /(emits?|emitted|authorizes|authorized) (a |the )?(VIOLATION|PROBABLE_VIOLATION)/i },
  { id: 'claims a probable class is permitted', pattern: /PROBABLE_VIOLATION (is|was) (permitted|authorized|available)/i },
  { id: 'claims the rule or evaluator is admitted', pattern: /(the rule is admitted|evaluator is admitted|an admitted evaluator now)/i },
  { id: 'claims a consumer-visible result', pattern: /consumer-visible (result|output)s? (was|were) (produced|shown|displayed)/i },
  { id: 'claims a deployment', pattern: /(deployed to|uploaded to|hosted at|published to) (the )?(consumer|production|hosting)/i },
  { id: 'claims the legacy system was changed', pattern: /legacy (system|corpus) (was|has been) (modified|updated|written)/i },
  { id: 'claims support beyond the evidenced specimen', pattern: /supported for (every|all|any other) (Equifax|report|presentation)/i }
];
for (const f of forbidden) check(`narrative does not ${f.id}`, !f.pattern.test(text), f.pattern.source);

const doc = {
  artifact: 'narrative_check.json',
  work_order: 'PHASE5-001I-A',
  created_utc: new Date().toISOString().slice(0, 10),
  purpose: 'the required sections and facts are present in this order\'s narrative, and no forbidden claim appears',
  narrative_bytes: Buffer.byteLength(text, 'utf8'),
  checks,
  check_count: checks.length,
  failures,
  verdict: failures.length === 0 ? 'NARRATIVE CHECKS PASSED' : 'NARRATIVE CHECKS FAILED — see failures'
};
fs.writeFileSync(path.join(OUT, 'narrative_check.json'), JSON.stringify(doc, null, 2) + '\n', 'utf8');
for (const c of checks) console.log(`${c.passed ? 'PASS' : 'FAIL'}  ${c.check} — ${c.detail}`);
console.log(`${checks.length} checks, ${failures.length} failures`);
console.log(doc.verdict);
process.exitCode = failures.length === 0 ? 0 : 1;
