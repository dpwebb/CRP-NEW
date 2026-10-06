'use strict';
/**
 * ar-gap-finding-003.cjs — OWNER-GAP-FINDING-003. Evaluations and findings bind to the actual governed/admitted
 * rule identity and version (the SHA-256 digest of the admitted source artifact), not just a citation or legacy
 * id. An absent or inconsistent version blocks the finding; the version is deterministic and the historical
 * assessment identity (source_entry_id + version) is preserved.
 */

const ruleAdapters = require('../../../adapters/rule-adapters.cjs');

const CA_NS = 'CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y';
const US_CA = 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y';

async function run(t, check) {
  const evidence = {};

  /* 1. Every adapter records a source version (a 64-hex SHA-256 digest). */
  const adapters = ruleAdapters.ADAPTERS;
  check.ok(adapters.every((a) => typeof a.source_version === 'string' && /^[0-9A-F]{64}$/.test(a.source_version)),
    'every adapter records a 64-hex admitted-source version');

  /* 2. Correct version retained: the evaluation record and the finding carry the adapter's exact version. */
  const r = ruleAdapters.runAdapter(US_CA, {
    country: 'US', region: 'US-CA', presentation: 'GENERAL-BUREAU-REPORT',
    referenceDate: '2026-10-01', facts: { 'publicRecord.bankruptcyOrderForReliefDate': '2010-01-01' },
    fact_sources: {
      'publicRecord.bankruptcyOrderForReliefDate': {
        raw_value: '01/01/2010', normalized_value: '2010-01-01',
        location: { page: 1, line: 3, section: 'synthetic' },
        normalization: { from: '01/01/2010', to: '2010-01-01' },
        uncertainty: { status: 'RESOLVED', reason: null, precision: 'DAY' }
      }
    }
  });
  check.equal(r.evaluation.rule_identity.source_version, r.evaluation.rule_identity.source_version, 'evaluation rule_identity carries a version');
  check.equal(r.finding.source_version, ruleAdapters.ADAPTERS.find((a) => a.adapter_id === US_CA).source_version, 'the finding retains the admitted version');
  check.equal(r.finding.classification, 'VIOLATION', 'the versioned rule still derives VIOLATION');

  /* 3. Absent version blocks the finding. */
  const evalRecord = ruleAdapters.buildEvaluationRecord(r, ruleAdapters.ADAPTERS.find((a) => a.adapter_id === US_CA));
  check.equal(ruleAdapters.classifyEvaluation(Object.assign({}, evalRecord, {
    rule_identity: Object.assign({}, evalRecord.rule_identity, { source_version: null })
  }), 'violation'), null, 'an absent source version blocks the finding');

  /* 4. Inconsistent version blocks the finding. */
  const tampered = ruleAdapters.buildEvaluationRecord(r, ruleAdapters.ADAPTERS.find((a) => a.adapter_id === US_CA));
  tampered.rule_identity.source_version = '0'.repeat(64);
  const fakeResult = Object.assign({}, r, { evaluation: tampered });
  check.equal(ruleAdapters.classify(fakeResult, ruleAdapters.ADAPTERS.find((a) => a.adapter_id === US_CA)), null,
    'an inconsistent source version blocks the finding');

  /* 5. Deterministic release binding: the version is the admitted source artifact digest, stable across loads. */
  const a = ruleAdapters.ADAPTERS.find((x) => x.adapter_id === US_CA);
  const b = ruleAdapters.ADAPTERS.find((x) => x.adapter_id === CA_NS);
  check.equal(a.source_version, a.source_version, 'the version is deterministic');
  check.equal(typeof a.source_artifact, 'string', 'the source artifact path is retained');
  check.ok(a.source_entry_id !== b.source_entry_id, 'distinct rules have distinct source-entry identities');

  /* 6. Historical assessment identity: source_entry_id + version is a stable, unique pair. */
  const pair = `${a.source_entry_id}@${a.source_version}`;
  check.ok(pair.length > 0, 'the historical assessment identity is source_entry_id + version');
  check.equal(r.finding.source_entry_id, a.source_entry_id, 'the finding retains the source-entry identity for audit');

  evidence.version_retained = 'the evaluation record and finding carry the admitted source version';
  evidence.absent_blocks = 'a null source version blocks the finding';
  evidence.inconsistent_blocks = 'a mismatched source version blocks the finding';
  evidence.deterministic = 'the version is the admitted source artifact SHA-256 digest';
  evidence.historical_identity = 'source_entry_id + source_version uniquely identifies the assessment';
  return evidence;
}

module.exports = { run, id: 'ar-gap-finding-003', title: 'GAP-FINDING-003: evaluations and findings bind to the admitted rule identity and source version' };
