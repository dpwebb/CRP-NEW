'use strict';
const assert = require('node:assert/strict');
const { deriveFdtEvidence, COMPOSITE_SCOPE, REQUIRED_CRITERIA, HOSTED_CRITERIA } = require('./release-proof-adapter.cjs');
const copy = (value) => JSON.parse(JSON.stringify(value));
let assertions = 0;
const test = (label, action) => { action(); assertions++; console.log(`PASS: ${label}`); };

function fixture() {
  const candidate = { build_id: 'crp-v1-aaaaaaaaaaaaaaaa', git_head: 'c'.repeat(40), manifest_digest: 'A'.repeat(64) };
  const acceptance = { passed: false, implementation_passed: true, recovery_rate: 0.975, recovered: 39, expected_decisive_fact_denominator: 40,
    incorrect_decisive_facts: 0, cross_record_or_bureau_borrowing: 0, unsupported_violations: 0, missing_expected_violations: 0,
    record_collapse_errors: 0, withhold_errors: 0, every_miss_accounted: true, freeze_unchanged: true, source_unchanged: true,
    freeze_digest: 'UNIT_FIXTURE_ONLY', source_files: [{ file: 'internal-validation/fixture.cjs', sha256: 'd'.repeat(64) }],
    historical_hosted: { build_id: 'historical-unit-build', credited_as_current: false } };
  const section = { id: 'am-fdt-recovery', file: 'am-fdt-recovery.cjs', completed: true, passed: 42, failed: 0, skipped: [],
    evidence: { acceptance, benchmark_full: { passed: true, baseline: 'UNIT_FIXTURE_ONLY', metrics: { missed_fact_rate: 0.025, incorrect_reading_rate: 0, retained_other_metric: 7 } },
      local_recovery: { useful_facts: 2, useful_attempts: 1, unsuccessful_facts: 0, unsuccessful_attempts: 1, pass_limit: 1 } } };
  const context = { kind: 'ACCEPTED_FULL_WITH_CONTINUITY', baselineSha: 'b'.repeat(64), proofSha: 'e'.repeat(64),
    currentSourceHashes: [{ file: 'accelerated-launch/service/fdt-acceptance.cjs', sha256: 'f'.repeat(64) }],
    evidenceRefs: [{ file: 'continuity/original-full.json', sha256: 'b'.repeat(64) }, { file: 'continuity/composite.json', sha256: 'e'.repeat(64) }],
    baselineRaw: { mode: 'FULL_CURRENT_PRODUCT', totals: { passed: 42, failed: 0, skipped: 0 }, selected_sections: ['am-fdt-recovery'],
      unrun_sections: [], source_drift: [], source_hashes: [{ file: 'accelerated-launch/service/fdt-acceptance.cjs', sha256: '1'.repeat(64) }], sections: [section] } };
  const evidence = { passed: true, identity: { build_id: candidate.build_id, served_build_id: candidate.build_id, local_only: false },
    staging_verification: { status: 'VERIFIED', reason: 'UNIT_FIXTURE_ONLY supplied observation' },
    served_recovery: { identity: { build_id: candidate.build_id, served_build_id: candidate.build_id }, observed_at: '2026-10-14T12:00:00Z',
      recovery_cases: ['USEFUL', 'UNSUCCESSFUL'].map((scenario) => ({ scenario, case_id: 'UNIT_FIXTURE_ONLY', input_sha256: '2'.repeat(64),
        input_page_count: 1, upload_status: 201, result_status: 201,
        recovery: { bounded: true, substitution_forbidden: true, recovery_attempts: 1,
          facts_added: scenario === 'USEFUL' ? [{ page: 1, line: 1, source: 'LOCAL_OCR' }] : [] },
        reading_limitations: { incomplete: true, never_equates_unread_with_absence: true },
        response: { actual_payload: 'untouched supplied proof' } })) },
    implementation: { configured: false, tests: [{ id: 'am-fdt-recovery', passed: false }] }, tests: [{ id: 'am-fdt-recovery', passed: false }],
    criteria: Object.fromEntries(REQUIRED_CRITERIA.map((key) => [key, { passed: true, expected: `UNIT_FIXTURE_ONLY ${key}`, measured: 'caller observation', evidence_refs: ['current-measurements.json'] }])) };
  return { context, evidence, candidate };
}

test('raw full metrics, receipt hashes and current source references remain exact', () => {
  const input = fixture(), before = copy(input), result = deriveFdtEvidence(input), raw = input.context.baselineRaw.sections[0].evidence;
  assert.deepEqual(result.acceptance, raw.acceptance);
  assert.deepEqual(result.benchmark, { ...raw.benchmark_full.metrics, baseline: raw.benchmark_full.baseline });
  assert.deepEqual(result.implementation.source_files, [...input.context.currentSourceHashes, ...raw.acceptance.source_files]);
  assert.deepEqual(result.implementation.evidence_refs, input.context.evidenceRefs);
  assert.equal(result.inherited_full_receipt.sha256, input.context.baselineSha);
  assert.equal(result.verification_scope, COMPOSITE_SCOPE);
  assert.deepEqual(input, before, 'adapter does not mutate inputs');
});

test('caller candidate identity and fresh hosted observations/verdicts are preserved', () => {
  const input = fixture(), result = deriveFdtEvidence(input);
  assert.deepEqual(result.identity, input.evidence.identity);
  assert.deepEqual(result.served_recovery, input.evidence.served_recovery);
  assert.deepEqual(result.staging_verification, input.evidence.staging_verification);
  assert.equal(result.passed, input.evidence.passed);
  for (const key of HOSTED_CRITERIA) assert.deepEqual(result.criteria[key], input.evidence.criteria[key]);
  assert.match(result.tests[0].measured, /Inherited complete full receipt: 42 assertions/);
});

test('pending hosted recovery stays pending while inherited local implementation is derived', () => {
  const input = fixture(); input.evidence.passed = false; input.evidence.identity.served_build_id = null;
  input.evidence.identity.local_only = true; input.evidence.served_recovery = null;
  input.evidence.staging_verification = { status: 'PENDING', reason: 'UNIT_FIXTURE_ONLY no hosted observations' };
  for (const key of HOSTED_CRITERIA) input.evidence.criteria[key].passed = false;
  const result = deriveFdtEvidence(input);
  assert.equal(result.passed, false); assert.equal(result.served_recovery, null);
  assert.equal(result.identity.served_build_id, null); assert.equal(result.staging_verification.status, 'PENDING');
  assert.equal(result.implementation.configured, true);
  for (const key of HOSTED_CRITERIA) assert.deepEqual(result.criteria[key], input.evidence.criteria[key]);
});

test('unrelated failed caller tests are not promoted or deleted', () => {
  const input = fixture(), other = { id: 'UNIT_FIXTURE_ONLY-failed-hosted-check', passed: false };
  input.evidence.tests.push(other); input.evidence.implementation.tests.push(other);
  const result = deriveFdtEvidence(input);
  assert.deepEqual(result.tests.find((row) => row.id === other.id), other);
  assert.deepEqual(result.implementation.tests.find((row) => row.id === other.id), other);
});

for (const [label, corrupt] of [
  ['noncomposite context', (input) => { input.context.kind = 'FRESH_FULL'; }],
  ['missing raw receipt hash', (input) => { delete input.context.baselineSha; }],
  ['missing composite hash reference', (input) => { input.context.evidenceRefs.pop(); }],
  ['missing current sources', (input) => { input.context.currentSourceHashes = []; }],
  ['unsafe evidence reference', (input) => { input.context.evidenceRefs[0].file = '../outside.json'; }],
  ['wrong candidate identity', (input) => { input.candidate.build_id = 'wrong-build'; }],
  ['wrong gate identity', (input) => { input.evidence.identity.build_id = 'wrong-build'; }],
  ['wrong served recovery identity', (input) => { input.evidence.served_recovery.identity.served_build_id = 'wrong-build'; }],
  ['asserted hosted success without observations', (input) => { input.evidence.served_recovery = null; }],
  ['missing criterion', (input) => { delete input.evidence.criteria.benchmark; }],
  ['skipped full execution', (input) => { input.context.baselineRaw.totals.skipped = 1; }],
  ['partial full section', (input) => { input.context.baselineRaw.sections[0].completed = false; }],
  ['full totals mismatch', (input) => { input.context.baselineRaw.totals.passed++; }],
  ['missing FDT section', (input) => { input.context.baselineRaw.sections[0].id = 'other'; input.context.baselineRaw.selected_sections = ['other']; }],
  ['recovery below threshold', (input) => { input.context.baselineRaw.sections[0].evidence.acceptance.recovery_rate = 0.94; }],
  ['unsupported violation', (input) => { input.context.baselineRaw.sections[0].evidence.acceptance.unsupported_violations = 1; }],
  ['benchmark below accuracy threshold', (input) => { input.context.baselineRaw.sections[0].evidence.benchmark_full.metrics.missed_fact_rate = 0.1; }],
  ['unbounded local recovery', (input) => { input.context.baselineRaw.sections[0].evidence.local_recovery.pass_limit = 2; }],
  ['missing FDT source refs', (input) => { input.context.baselineRaw.sections[0].evidence.acceptance.source_files = []; }],
  ['non-JSON metrics', (input) => { input.context.baselineRaw.sections[0].evidence.acceptance.recovery_rate = NaN; }]
]) test(`${label} is refused`, () => { const input = fixture(); corrupt(input); assert.throws(() => deriveFdtEvidence(input), /FDT_COMPOSITE_ADAPTER_REFUSED/); });

test('output objects do not alias caller or raw historical evidence', () => {
  const input = fixture(), before = copy(input), result = deriveFdtEvidence(input);
  result.acceptance.recovered = 999; result.served_recovery.recovery_cases[0].response.actual_payload = 'changed';
  result.implementation.evidence_refs[0].sha256 = '0'.repeat(64);
  assert.deepEqual(input, before);
});

console.log(`PASS: ${assertions} pure FDT composite adapter checks; no files, runtime services or hosted actions`);
