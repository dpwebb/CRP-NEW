'use strict';

// This pure adapter consumes validateProductProof's already validated composite
// context. It performs no file reads, writes, test execution or hosted actions.
// Existing strict source/reference and hosted-response validators still apply.
const COMPOSITE_SCOPE = 'Inherited full FDT metrics, current dependency continuity, and fresh hosted recovery';
const HOSTED_CRITERIA = Object.freeze(['demonstrate_useful_recovery_on_deployed', 'demonstrate_bounded_unsuccessful_recovery_on_deployed']);
const REQUIRED_CRITERIA = Object.freeze(['freeze_before_run', 'independent_held_out_set', 'zero_incorrect_decisive_facts',
  'zero_cross_record_or_bureau_borrowing', 'zero_unsupported_violations', 'min_recovery_of_readable_assessment_required_facts',
  'account_for_every_remaining_miss', 'withhold_unreadable_or_conflicting_decisive_facts', ...HOSTED_CRITERIA, 'benchmark']);
const LOCAL_CRITERIA = Object.freeze(REQUIRED_CRITERIA.filter((key) => !HOSTED_CRITERIA.includes(key)).concat('useful_recovery', 'bounded_unsuccessful_recovery'));
const DIGEST = /^[a-f0-9]{64}$/i;

function requireProof(condition, detail) {
  if (!condition) throw new Error(`FDT_COMPOSITE_ADAPTER_REFUSED: ${detail}`);
}

function clone(value) {
  // Evidence is JSON. Reject values a JSON clone would silently coerce or discard.
  const inspect = (item, ancestors) => {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
    if (typeof item === 'number') { requireProof(Number.isFinite(item), 'non-finite evidence value'); return; }
    requireProof(item && typeof item === 'object' && !ancestors.has(item), 'non-JSON evidence value');
    requireProof(Array.isArray(item) || Object.getPrototypeOf(item) === Object.prototype, 'non-JSON evidence value');
    const next = new Set(ancestors); next.add(item);
    for (const key of Object.keys(item)) inspect(item[key], next);
  };
  inspect(value, new Set());
  return JSON.parse(JSON.stringify(value));
}

function references(rows, label) {
  requireProof(Array.isArray(rows) && rows.length > 0, `${label} references absent`);
  for (const row of rows) {
    requireProof(row && typeof row.file === 'string' && row.file && !/^[\\/]|^[a-z]:|[\r\n\0]/i.test(row.file)
      && !row.file.replace(/\\/g, '/').split('/').includes('..') && DIGEST.test(row.sha256 || ''), `${label} reference invalid`);
  }
}

function completeFull(full) {
  requireProof(full?.mode === 'FULL_CURRENT_PRODUCT' && Number.isInteger(full.totals?.passed) && full.totals.passed > 0
    && full.totals.failed === 0 && full.totals.skipped === 0 && Array.isArray(full.unrun_sections) && !full.unrun_sections.length
    && Array.isArray(full.source_drift) && !full.source_drift.length && Array.isArray(full.sections) && full.sections.length > 0,
  'complete passing full receipt required');
  requireProof(full.sections.every((row) => row.completed === true && row.failed === 0 && !row.section_exception
    && Array.isArray(row.skipped) && row.skipped.length === 0 && Number.isInteger(row.passed) && row.passed >= 0),
  'incomplete full section');
  const ids = full.sections.map((row) => row.id);
  requireProof(new Set(ids).size === ids.length && Array.isArray(full.selected_sections)
    && new Set(full.selected_sections).size === ids.length && full.selected_sections.length === ids.length
    && ids.every((id) => full.selected_sections.includes(id))
    && full.sections.reduce((sum, row) => sum + row.passed, 0) === full.totals.passed,
  'full receipt selection or totals mismatch');
  references(full.source_hashes, 'full source');
  const section = full.sections.find((row) => row.id === 'am-fdt-recovery'), raw = section?.evidence;
  const acceptance = raw?.acceptance, benchmark = raw?.benchmark_full, recovery = raw?.local_recovery;
  requireProof(section?.passed > 0 && acceptance?.implementation_passed === true
    && Number.isFinite(acceptance.recovery_rate) && acceptance.recovery_rate >= 0.95 && acceptance.recovery_rate <= 1
    && ['incorrect_decisive_facts', 'cross_record_or_bureau_borrowing', 'unsupported_violations', 'missing_expected_violations',
      'record_collapse_errors', 'withhold_errors'].every((key) => acceptance[key] === 0)
    && ['every_miss_accounted', 'freeze_unchanged', 'source_unchanged'].every((key) => acceptance[key] === true)
    && benchmark?.passed === true && benchmark.baseline
    && Number.isFinite(benchmark.metrics?.missed_fact_rate) && benchmark.metrics.missed_fact_rate >= 0
    && benchmark.metrics.missed_fact_rate <= 0.05 && benchmark.metrics.incorrect_reading_rate === 0
    && recovery?.useful_facts > 0 && recovery.useful_attempts === 1 && recovery.unsuccessful_facts === 0
    && recovery.unsuccessful_attempts === 1 && recovery.pass_limit === 1, 'raw FDT recovery or accuracy thresholds failed');
  references(acceptance.source_files, 'FDT dependency');
  return { section, acceptance, benchmark };
}

function deriveFdtEvidence({ context, evidence, candidate }) {
  requireProof(context?.kind === 'ACCEPTED_FULL_WITH_CONTINUITY', 'validated composite context required');
  requireProof(DIGEST.test(context.baselineSha || '') && DIGEST.test(context.proofSha || ''), 'raw and composite receipt hashes required');
  requireProof(candidate && /^[a-f0-9]{40}$/.test(candidate.git_head || '') && DIGEST.test(candidate.manifest_digest || '')
    && candidate.build_id === `crp-v1-${candidate.manifest_digest.slice(0, 16).toLowerCase()}`, 'actual candidate identity required');
  references(context.currentSourceHashes, 'current source');
  references(context.evidenceRefs, 'composite proof');
  requireProof(context.evidenceRefs.some((ref) => ref.sha256.toUpperCase() === context.baselineSha.toUpperCase())
    && context.evidenceRefs.some((ref) => ref.sha256.toUpperCase() === context.proofSha.toUpperCase()), 'raw/composite receipt references required');
  const raw = completeFull(context.baselineRaw);
  const result = clone(evidence);
  requireProof(result?.identity?.build_id === candidate.build_id
    && [null, undefined, candidate.build_id].includes(result.identity.served_build_id), 'candidate/served gate identity mismatch');
  for (const key of ['git_head', 'manifest_digest']) {
    if (result.identity[key] !== undefined) requireProof(result.identity[key] === candidate[key], 'candidate gate provenance mismatch');
  }
  if (result.served_recovery !== null && result.served_recovery !== undefined) {
    requireProof(result.served_recovery.identity?.build_id === candidate.build_id
      && result.served_recovery.identity?.served_build_id === candidate.build_id, 'hosted recovery belongs to another candidate');
  }
  requireProof(result.passed !== true || (result.served_recovery && result.identity.served_build_id === candidate.build_id),
    'hosted success cannot be supplied without current recovery proof');
  requireProof(result.criteria && typeof result.criteria === 'object' && !Array.isArray(result.criteria)
    && Object.keys(result.criteria).length === REQUIRED_CRITERIA.length && REQUIRED_CRITERIA.every((key) => Object.hasOwn(result.criteria, key)),
    'existing complete FDT criterion template required');
  const measured = `Inherited complete full receipt: ${raw.section.passed} assertions; ${raw.acceptance.recovered ?? 'recorded'}/${raw.acceptance.expected_decisive_fact_denominator ?? 'recorded'} own decisive facts; ${raw.acceptance.unsupported_violations} unexpected violations`;
  const localTest = { id: 'am-fdt-recovery', passed: true, criteria: [...LOCAL_CRITERIA],
    expected: 'source-bound native acceptance, active checklist positive/benign controls, withholding, useful and bounded unsuccessful recovery', measured };
  const replaceLocal = (tests) => [localTest, ...(Array.isArray(tests) ? tests.filter((test) => test.id !== 'am-fdt-recovery') : [])];
  result.acceptance = clone(raw.acceptance);
  result.benchmark = clone({ ...raw.benchmark.metrics, baseline: raw.benchmark.baseline });
  result.verification_scope = COMPOSITE_SCOPE;
  result.implementation = { ...(result.implementation || {}), configured: true, scope: COMPOSITE_SCOPE,
    tests: replaceLocal(result.implementation?.tests), source_files: clone([...context.currentSourceHashes, ...raw.acceptance.source_files]),
    evidence_refs: clone(context.evidenceRefs) };
  result.tests = replaceLocal(result.tests);
  for (const key of REQUIRED_CRITERIA.filter((item) => !HOSTED_CRITERIA.includes(item))) {
    requireProof(result.criteria[key] && typeof result.criteria[key] === 'object', 'malformed local criterion template');
    // The measured local pass is inherited. Caller-supplied target-bound references
    // remain intact; the strict validator separately checks the composite chain.
    result.criteria[key] = { ...result.criteria[key], passed: true, measured };
  }
  result.inherited_full_receipt = { sha256: context.baselineSha,
    scope: 'Original complete full execution; measurements and receipt identity retained without a new full run' };
  return result;
}

module.exports = { deriveFdtEvidence, COMPOSITE_SCOPE, REQUIRED_CRITERIA, LOCAL_CRITERIA, HOSTED_CRITERIA };
