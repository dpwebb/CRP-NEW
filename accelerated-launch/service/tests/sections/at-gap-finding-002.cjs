'use strict';
/**
 * at-gap-finding-002.cjs — OWNER-GAP-FINDING-002-RESOURCE-001 (owner decision + scoped candidate). A reliably read
 * bankruptcy record that prints an Order for Relief date more than ten years before its report date AND expressly
 * states the printed date's correspondence to the actual court order is unverified/unavailable derives
 * PROBABLE_VIOLATION (never VIOLATION) for the US-CA rule. The qualifier is read and associated by the extractor —
 * never asserted directly in runAdapter — and an ordinary entry, a generic disclaimer, a cross-record qualifier, an
 * in-period date, a low-confidence qualifier or an arbitrary list does not trigger it.
 */

const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const generalIntake = require('../../general-intake.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const US_CA = 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y';

function caFinding(lines) {
  const ext = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [lines] }), { mode: 'REPORT', country: 'US' });
  const res = evaluation.evaluateCase({ country: 'US', region: 'US-CA', extraction: ext });
  const row = res.results.find((r) => r.check.adapter_id === US_CA && r.machine.state === 'EVALUATED');
  return row ? row.machine.finding : null;
}

async function run(t, check) {
  const evidence = {};

  /* 1. Qualified positive candidate. */
  const positive = caFinding([
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Bankruptcy Public Record: TEST-BK-001',
    'Order for Relief: January 1, 2011',
    'Historical verification for TEST-BK-001: the Order for Relief date above is the reported date; its correspondence to the actual court order is unverified and cannot be established from this disclosure.'
  ]);
  check.equal(positive.classification, 'PROBABLE_VIOLATION', 'the scoped candidate derives PROBABLE, never VIOLATION');
  check.equal(positive.decisive_fact_unavailable, 'publicRecord.bankruptcyOrderForReliefDate.historical_correspondence', 'the decisive issue is named exactly');
  const d = positive.decisive_facts[0];
  check.equal(d.decisive, true, 'the decisive fact is marked decisive');
  check.equal(d.unavailable_from_resolved_reading, true, 'the decisive fact is unavailable from a resolved reading');
  check.ok(d.source && d.source.location && d.source.location.page === 1, 'the decisive fact is source-linked');

  /* 2. In-period asserted date. */
  check.equal(caFinding([
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Bankruptcy Public Record: TEST-BK-002',
    'Order for Relief: January 1, 2023',
    'Historical verification for TEST-BK-002: its correspondence to the actual court order is unverified.'
  ]), null, 'an in-period asserted date yields no finding');

  /* 3. Absence of the qualifier: VIOLATION, not PROBABLE. */
  const ordinary = caFinding([
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Bankruptcy Public Record: TEST-BK-003',
    'Order for Relief: January 1, 2011'
  ]);
  check.equal(ordinary.classification, 'VIOLATION', 'an ordinary expired order-for-relief date without the qualifier stays VIOLATION');

  /* 4. A generic disclaimer is not the trigger. */
  const generic = caFinding([
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Bankruptcy Public Record: TEST-BK-004',
    'Order for Relief: January 1, 2011',
    'Information in this report may be incomplete or inaccurate.'
  ]);
  check.equal(generic.classification, 'VIOLATION', 'a generic disclaimer is not the unverified-correspondence trigger');

  /* 5. A qualifier naming a different record does not attach. */
  const cross = caFinding([
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Bankruptcy Public Record: TEST-BK-005',
    'Order for Relief: January 1, 2011',
    'Historical verification for TEST-BK-999: its correspondence to the actual court order is unverified.'
  ]);
  check.equal(cross.classification, 'VIOLATION', 'a qualifier naming a different record does not make THIS date probable');

  /* 6. Conflicting order-for-relief dates are withheld. */
  check.equal(caFinding([
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Bankruptcy Public Record: TEST-BK-006',
    'Order for Relief: January 1, 2011',
    'Order for Relief: March 5, 2013',
    'Historical verification for TEST-BK-006: its correspondence to the actual court order is unverified.'
  ]), null, 'conflicting order-for-relief dates withhold the finding');

  /* 7. A low-confidence qualifier is withheld (never establishes the trigger). */
  const lowRecords = generalIntake.buildRecords([{
    page: 1, source: 'LOCAL_OCR',
    lines: [
      { text: 'Bankruptcy Public Record: TEST-BK-007', page: 1, line: 1, source: 'LOCAL_OCR', trusted: true, confidence: 90, min_confidence: 80, words: [] },
      { text: 'Order for Relief: January 1, 2011', page: 1, line: 2, source: 'LOCAL_OCR', trusted: true, confidence: 90, min_confidence: 80, words: [] },
      { text: 'Historical verification for TEST-BK-007: its correspondence to the actual court order is unverified.', page: 1, line: 3, source: 'LOCAL_OCR', trusted: false, confidence: 20, min_confidence: 10, words: [] }
    ]
  }]);
  const lowRecord = lowRecords.find((r) => r.public_record_identity === 'TEST-BK-007');
  check.equal(lowRecord && lowRecord.facts['publicRecord.bankruptcyOrderForReliefDate.historicalVerification'], undefined, 'a low-confidence qualifier is withheld (never a trigger)');

  /* 8. An arbitrary manually-supplied unavailable-fact list is refused. */
  const breach = ruleAdapters.runAdapter(US_CA, {
    country: 'US', region: 'US-CA', presentation: 'GENERAL-BUREAU-REPORT', referenceDate: '2026-10-01',
    facts: { 'publicRecord.bankruptcyOrderForReliefDate': '2010-01-01' },
    fact_sources: { 'publicRecord.bankruptcyOrderForReliefDate': { raw_value: '01/01/2010', normalized_value: '2010-01-01', location: { page: 1, line: 3 }, normalization: { from: '01/01/2010', to: '2010-01-01' }, uncertainty: { status: 'RESOLVED', reason: null, precision: 'DAY' } } }
  });
  const arbitrary = Object.assign({}, ruleAdapters.buildEvaluationRecord(breach, ruleAdapters.ADAPTERS.find((a) => a.adapter_id === US_CA)), {
    decisive_facts_unavailable: [{ identity: 'x' }]
  });
  check.equal(ruleAdapters.classifyEvaluation(arbitrary, 'violation'), null, 'an arbitrary decisive-fact list is refused');

  evidence.positive = 'the scoped unverified-order-for-relief candidate derives PROBABLE with a source-linked, named decisive fact';
  evidence.negative = 'in-period date, absent qualifier, generic disclaimer, cross-record qualifier, conflicting dates, low-confidence qualifier and arbitrary lists all fail to derive PROBABLE';
  return evidence;
}

module.exports = { run, id: 'at-gap-finding-002', title: 'GAP-FINDING-002: the scoped unverified order-for-relief candidate derives PROBABLE (and only that trigger)' };

