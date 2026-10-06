'use strict';
/**
 * evidence-validator.cjs — OWNER-ACCEPT-010 C1. A shared STRICT validator for capability-blocker evidence.
 * Replaces the older weaker gates (passed===true + any non-empty identity.build_id + non-empty behavior).
 * Contract: a TARGET release identity must be supplied; evidence.passed===true; identity.build_id===target;
 * identity.served_build_id===target (a self-reported deployed flag is rejected); a COMPLETE named criterion set
 * (criteria) is required — each criterion with passed===true, expected, measured, and evidence references that
 * BIND to the target release (real files whose content names the target build, or JSON evidence bound to it).
 * When a blocker declares its required criterion keys, the set must be EXACTLY those keys: missing required
 * criteria and arbitrary substitute criteria are rejected. A behavior summary WITHOUT criteria/references is NOT
 * accepted. Optional benchmark thresholds are enforced. Missing criteria, malformed data, wrong/obsolete release,
 * stale code and absent references keep the blocker open. No circular build/evidence hash is accepted.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

/* OWNER-CLOSURE-001: implementation credit is independent of a hosted payment/browser journey.
 * Explicit behavioral coverage and source hashes are required; configuration flags alone never pass. */
function validateImplementationEvidence(evidence, opts) {
  const options = opts || {}, failures = [];
  const implementation = evidence && evidence.implementation;
  if (!implementation || implementation.configured !== true) {
    return { passed: false, failures: ['implementation evidence is absent or not configured'], detail: 'implementation evidence is absent or not configured' };
  }
  const root = path.resolve(options.sourceRoot || path.join(__dirname, '../..'));
  const required = (options.requiredCriteria || []).filter(k => !['end_to_end_journey', 'browser_journey', 'journey'].includes(k));
  const tests = implementation.tests || [];
  if (!Array.isArray(tests) || !tests.length || !tests.every(t => t && present(t.id) && t.passed === true && Object.hasOwn(t, 'expected') && Object.hasOwn(t, 'measured'))) failures.push('passing behavioral tests with expected and measured outcomes are required');
  for (const key of required) {
    if (!Array.isArray(tests) || !tests.some(t => t && t.passed === true && Array.isArray(t.criteria) && t.criteria.includes(key))) failures.push(`implementation behavior ${key} is not covered by a passing test`);
  }
  const sources = implementation.source_files;
  if (!Array.isArray(sources) || !sources.length) failures.push('implementation source hashes are required');
  else for (const entry of sources) {
    try {
      const file = path.resolve(root, entry.file);
      if (!file.startsWith(root + path.sep)) throw new Error('outside workspace');
      const digest = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      if (digest !== entry.sha256) failures.push(`implementation source changed: ${entry.file}`);
    } catch (_) { failures.push(`implementation source unavailable: ${entry && entry.file}`); }
  }
  const refs = implementation.evidence_refs;
  if (!Array.isArray(refs) || !refs.length) failures.push('behavioral evidence references are required');
  else for (const ref of refs) {
    try {
      const file = resolvePath(ref.file, root);
      if (!fs.statSync(file).isFile() || crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== ref.sha256) failures.push('behavioral evidence reference is missing or changed');
    } catch (_) { failures.push('behavioral evidence reference is missing or changed'); }
  }
  // Quantitative functional acceptance remains part of implementation, not merely deployment proof.
  const a = evidence.acceptance || {}, b = evidence.benchmark || {};
  if (options.acceptance) {
    if (options.acceptance.min_recovery_rate != null && (!Number.isFinite(a.recovery_rate) || a.recovery_rate < options.acceptance.min_recovery_rate || a.recovery_rate > 1)) failures.push('implementation recovery benchmark did not pass');
    for (const [gate, metric] of [['zero_incorrect_decisive_facts', 'incorrect_decisive_facts'], ['zero_cross_record_or_bureau_borrowing', 'cross_record_or_bureau_borrowing'], ['zero_unsupported_legal_findings', 'unsupported_legal_findings']]) if (options.acceptance[gate] && a[metric] !== 0) failures.push(`implementation acceptance ${metric} did not pass`);
  }
  if (options.benchmark) {
    for (const metric of ['missed_fact_rate', 'incorrect_reading_rate']) if (!Number.isFinite(b[metric]) || b[metric] < 0 || (options.benchmark[metric] != null && b[metric] > options.benchmark[metric])) failures.push(`implementation benchmark ${metric} did not pass`);
    if (options.benchmark.require_baseline && !present(b.baseline)) failures.push('implementation benchmark baseline is missing');
  }
  return { passed: failures.length === 0, failures, detail: failures.length ? failures.join('; ') : 'implemented and behaviorally tested; staging verification is tracked separately' };
}

function validateCapabilityStatus(evidence, opts) {
  const staging = validateCapabilityEvidence(evidence, opts);
  const implementation = validateImplementationEvidence(evidence, opts);
  /* OWNER-CLOSURE-001: an explicitly recorded pending staging boundary (e.g. a journey whose purchased
     download measured a non-200) keeps staging verification PENDING and leaves the production gate
     unresolved, even when earlier evidence fields report a pass. Implementation closure — from the
     implementation object or from current-release behavioral acceptance — is still credited. */
  const pendingBoundary = Boolean(evidence && evidence.staging_verification && evidence.staging_verification.status === 'PENDING');
  const stagingPassed = staging.passed && !pendingBoundary;
  return { passed: stagingPassed,
    detail: pendingBoundary ? (evidence.staging_verification.reason || 'staging verification is explicitly pending') : staging.detail,
    implementation_status: (implementation.passed || stagingPassed) ? 'IMPLEMENTED_AND_TESTED' : 'OPEN',
    implementation_detail: stagingPassed && !implementation.passed ? 'current-release behavioral acceptance also establishes implementation closure' : implementation.detail,
    staging_status: stagingPassed ? 'VERIFIED_ON_STAGING' : 'PENDING_VERIFICATION' };
}

function present(v) { return v != null && String(v).trim().length > 0; }

function resolvePath(ref, baseDir) {
  return path.isAbsolute(ref) ? ref : path.join(baseDir, ref);
}

/* A reference must name a real FILE. */
function referenceResolves(ref, baseDir) {
  if (!present(ref)) return false;
  try { return fs.statSync(resolvePath(ref, baseDir)).isFile(); } catch (_) { return false; }
}

/* A reference must BIND to the target release, not merely exist. It binds when its content names the target build
   id, or when it is a JSON evidence document whose identity names the target build. */
function referenceBinds(ref, baseDir, targetBuildId) {
  if (!referenceResolves(ref, baseDir)) return false;
  let text;
  try { text = fs.readFileSync(resolvePath(ref, baseDir), 'utf8'); } catch (_) { return false; }
  if (present(targetBuildId) && text.includes(String(targetBuildId))) return true;
  try {
    const obj = JSON.parse(text);
    const bid = (obj && obj.identity && obj.identity.build_id) || (obj && obj.build_id) || null;
    if (present(bid)) return present(targetBuildId) ? String(bid) === String(targetBuildId) : true;
  } catch (_) { /* not JSON evidence */ }
  return false;
}

function validateCapabilityEvidence(evidence, opts) {
  const options = opts || {};
  const failures = [];
  const target = present(options.targetBuildId) ? String(options.targetBuildId).trim() : null;
  const baseDir = present(options.baseDir) ? options.baseDir : process.cwd();
  const required = Array.isArray(options.requiredCriteria) && options.requiredCriteria.length
    ? options.requiredCriteria
    : null;

  if (!target) {
    failures.push('no target release identity was supplied; cannot validate evidence against a release');
    return { passed: false, failures, detail: failures.join('; ') };
  }
  if (!evidence || typeof evidence !== 'object') {
    failures.push('evidence is absent or malformed');
    return { passed: false, failures, detail: failures.join('; ') };
  }
  if (evidence.passed !== true) failures.push('evidence does not report the criteria as passed');
  const identity = evidence.identity || {};
  if (!present(identity.build_id)) failures.push('evidence is missing its candidate build identity');
  else if (identity.build_id !== target) failures.push(`evidence is from an obsolete/wrong build (candidate ${identity.build_id} != target ${target})`);
  if (!present(identity.served_build_id)) failures.push('evidence is missing its served build identity (a self-reported deployed flag is not proof)');
  else if (identity.served_build_id !== target) failures.push(`evidence is not verified on the served release (served ${identity.served_build_id} != target ${target})`);

  const criteria = evidence.criteria;
  if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) {
    failures.push('evidence carries no named criterion set (a behavior summary without criteria/references is not accepted)');
  } else {
    const keys = Object.keys(criteria);
    if (!keys.length) failures.push('criteria object is empty');

    if (required) {
      for (const k of required) {
        if (!Object.prototype.hasOwnProperty.call(criteria, k)) failures.push(`required criterion ${k} is missing`);
      }
      for (const k of keys) {
        if (!required.includes(k)) failures.push(`criterion ${k} is not in the required set (${required.join(', ')}); arbitrary substitute criteria are not accepted`);
      }
    }

    for (const key of keys) {
      const c = criteria[key];
      if (!c || typeof c !== 'object') { failures.push(`criterion ${key} is malformed`); continue; }
      if (c.passed !== true) failures.push(`criterion ${key} did not pass`);
      if (!present(c.expected)) failures.push(`criterion ${key} has no expected outcome`);
      if (!present(c.measured)) failures.push(`criterion ${key} has no measured outcome`);
      const refs = Array.isArray(c.evidence_refs) ? c.evidence_refs : [];
      if (!refs.length) failures.push(`criterion ${key} has no evidence references`);
      else if (!refs.every((ref) => referenceBinds(ref, baseDir, target))) failures.push(`criterion ${key} references evidence that does not resolve to a real file bound to the target release ${target}`);
    }
  }

  // Passing tests are required regardless of the criterion set.
  const tests = Array.isArray(evidence.tests) ? evidence.tests : [];
  if (!tests.length || !tests.every((t) => t && t.passed === true)) failures.push('evidence has no passing tests');

  if (options.benchmark) {
    const b = evidence.benchmark || {};
    if (!Number.isFinite(b.missed_fact_rate)) failures.push('benchmark missing or non-finite missed_fact_rate');
    else if (b.missed_fact_rate < 0) failures.push('benchmark missed_fact_rate is negative');
    if (!Number.isFinite(b.incorrect_reading_rate)) failures.push('benchmark missing or non-finite incorrect_reading_rate');
    else if (b.incorrect_reading_rate < 0) failures.push('benchmark incorrect_reading_rate is negative');
    if (options.benchmark.require_baseline && !present(b.baseline)) failures.push('benchmark missing baseline');
    if (options.benchmark.missed_fact_rate != null && Number.isFinite(b.missed_fact_rate) && b.missed_fact_rate > options.benchmark.missed_fact_rate) failures.push(`benchmark missed_fact_rate ${b.missed_fact_rate} exceeds threshold ${options.benchmark.missed_fact_rate}`);
    if (options.benchmark.incorrect_reading_rate != null && Number.isFinite(b.incorrect_reading_rate) && b.incorrect_reading_rate > options.benchmark.incorrect_reading_rate) failures.push(`benchmark incorrect_reading_rate ${b.incorrect_reading_rate} exceeds threshold ${options.benchmark.incorrect_reading_rate}`);
  }

  // OWNER-ACCEPT-010 FDT alignment: enforce the Owner-approved prospective acceptance criteria from the evidence's
  // `acceptance` record (>=95% recovery of readable required facts; zero incorrect decisive facts; zero
  // cross-record/bureau borrowing; zero unsupported legal findings).
  if (options.acceptance) {
    const a = evidence.acceptance || {};
    if (options.acceptance.min_recovery_rate != null) {
      if (!Number.isFinite(a.recovery_rate)) failures.push('acceptance missing or non-finite recovery_rate');
      else if (a.recovery_rate < 0 || a.recovery_rate > 1) failures.push('acceptance recovery_rate is outside [0,1]');
      else if (a.recovery_rate < options.acceptance.min_recovery_rate) failures.push(`acceptance recovery_rate ${a.recovery_rate} is below the required ${options.acceptance.min_recovery_rate}`);
    }
    if (options.acceptance.zero_incorrect_decisive_facts && a.incorrect_decisive_facts !== 0) failures.push('acceptance reports incorrect decisive facts');
    if (options.acceptance.zero_cross_record_or_bureau_borrowing && a.cross_record_or_bureau_borrowing !== 0) failures.push('acceptance reports cross-record/bureau borrowing');
    if (options.acceptance.zero_unsupported_legal_findings && a.unsupported_legal_findings !== 0) failures.push('acceptance reports unsupported legal findings');
  }

  return { passed: failures.length === 0, failures, detail: failures.length ? failures.join('; ') : 'evidence is complete, current-release and identity-bound' };
}

module.exports = { validateCapabilityEvidence, validateImplementationEvidence, validateCapabilityStatus, referenceResolves, referenceBinds, present };
