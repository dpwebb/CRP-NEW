'use strict';
/**
 * as-gap-finding-004.cjs — OWNER-GAP-FINDING-004. Every finding's evaluation evidence carries the exact raw
 * printed fact, its source document/page location, its normalization, its uncertainty and the enforced
 * evidence-policy version/digest. An absent or misassociated source blocks the finding, and no private evidence
 * leaks across accounts.
 */

const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const US_CA = 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y';
const adapter = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === US_CA);

function caEvaluation(facts) {
  const r = ruleAdapters.runAdapter(US_CA, {
    country: 'US', region: 'US-CA', presentation: 'GENERAL-BUREAU-REPORT',
    referenceDate: '2026-10-01', facts
  });
  return { r, evaluation: ruleAdapters.buildEvaluationRecord(r, adapter) };
}

function caPipeline(lines) {
  const ext = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [lines] }), { mode: 'REPORT', country: 'US' });
  return evaluation.evaluateCase({ country: 'US', region: 'US-CA', extraction: ext });
}

async function run(t, check) {
  const evidence = {};

  /* 1. A real-pipeline CA breach carries source-linked facts: raw value, location, normalization, uncertainty
        and the policy identity. */
  const pipeline = caPipeline([
    'Experian  Consumer Credit Report',
    'Report Date: 12 June 2026',
    'Bankruptcy  Date of Order for Relief: 01/01/2010'
  ]);
  const row = pipeline.results.find((r) => r.check.adapter_id === US_CA && r.machine.state === 'EVALUATED');
  check.ok(row, 'a CA breach row evaluates');
  check.equal(row.machine.finding.classification, 'VIOLATION', 'the CA breach still derives VIOLATION with source-linked evidence');
  const fact = row.machine.evaluation.required_facts[0];
  check.equal(fact.source.raw_value, '01/01/2010', 'the exact raw printed fact is retained');
  check.equal(fact.source.normalized_value, '2010-01-01', 'the normalized value is retained');
  check.ok(fact.source.location && fact.source.location.page === 1, 'the source page location is retained');
  check.deepEqual(fact.source.normalization, { from: '01/01/2010', to: '2010-01-01' }, 'the normalization step is retained');
  check.equal(fact.source.uncertainty.status, 'RESOLVED', 'the uncertainty is retained');
  check.equal(row.machine.evaluation.policy.policy_id, 'OWNER-EVIDENCE-001', 'the policy identity is retained');
  check.equal(row.machine.evaluation.policy.version, '1.0', 'the policy version is retained');
  check.equal(row.machine.evaluation.policy.digest, 'd48e463375a2b7fb1497a3fa2f51cd9683863a3f2b37a11cf38e455811e8cb47', 'the policy digest is retained');

  /* 2. Absent source evidence blocks the finding. */
  const { evaluation: base } = caEvaluation({ 'publicRecord.bankruptcyOrderForReliefDate': '2010-01-01' });
  const noSource = Object.assign({}, base);
  noSource.required_facts = base.required_facts.map((f) => Object.assign({}, f, { source: null }));
  check.equal(ruleAdapters.classifyEvaluation(noSource, 'violation'), null, 'an absent source blocks the finding');

  /* 3. Misassociated evidence blocks the finding. */
  const misassociated = Object.assign({}, base);
  misassociated.required_facts = base.required_facts.map((f) => Object.assign({}, f, {
    source: Object.assign({}, f.source, { normalized_value: '2009-12-31' })
  }));
  check.equal(ruleAdapters.classifyEvaluation(misassociated, 'violation'), null, 'a misassociated source (wrong normalized value) blocks the finding');

  /* 4. Two records do not leak each other's evidence: each finding's source record_index is its own. */
  const two = caPipeline([
    'Experian  Consumer Credit Report',
    'Report Date: 12 June 2026',
    'Bankruptcy  Date of Order for Relief: 01/01/2010',
    'Bankruptcy  Date of Order for Relief: 01/01/2005'
  ]);
  const findings = two.results.filter((r) => r.check.adapter_id === US_CA && r.machine.finding);
  check.equal(findings.length, 2, 'two distinct bankruptcy records produce two findings');
  const indices = findings.map((r) => r.machine.evaluation.required_facts[0].source.record_index);
  check.equal(new Set(indices).size, 2, 'each finding binds to its own record (no cross-account association)');
  check.ok(indices.every((i) => Number.isInteger(i) && i > 0), 'each source carries its own record index');

  evidence.source_linked = 'raw fact, page/line location, normalization, uncertainty and policy digest are retained in the finding evidence';
  evidence.absent_blocks = 'a fact with no source blocks the finding';
  evidence.misassociated_blocks = 'a fact whose source value does not match its evaluated value blocks the finding';
  evidence.no_cross_account_leakage = 'each finding binds to its own record source, never another account';
  return evidence;
}

module.exports = { run, id: 'as-gap-finding-004', title: 'GAP-FINDING-004: findings carry source-linked facts (raw value, location, normalization, uncertainty, policy) and refuse absent/misassociated evidence' };
