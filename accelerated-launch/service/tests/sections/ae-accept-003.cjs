'use strict';
/**
 * ae-accept-003.cjs — OWNER-ACCEPT-003 D1–D4. The two formerly-withheld limbs (collection 180-day rule,
 * satisfied judgment) and the per-rule classification, proven through the engine.
 */

const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

function runEngine(country, region, lines) {
  const model = makeSyntheticModel({ pages: [lines] });
  const ext = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country });
  return evaluation.evaluateCase({ country, region, extraction: ext });
}
function row(result, adapterId) {
  return result.results.find((r) => r.check.adapter_id === adapterId);
}

async function run(t, check) {
  const evidence = {};

  /* ===== D2: FCRA-605A-4 collection, 180-day rule ===== */
  const collectionBreach = runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Collection  Date of First Delinquency: 01/01/2017']);
  const c1 = row(collectionBreach, 'FCRA-605A-4-US-NATIONAL-7Y');
  check.equal(c1.machine.state, 'EVALUATED', 'D2: collection breach evaluates');
  check.equal(c1.machine.outcome, 'PERIOD_EXCEEDED', 'D2: delinquency 2017 + 180 days + 7 years is exceeded by 2026');
  check.equal(c1.machine.anchor.iso, '2017-06-30', 'D2: the anchor is shifted 180 days after the delinquency');
  check.equal(c1.machine.finding && c1.machine.finding.classification, 'PROBABLE_VIOLATION', 'D2/ACCEPT-005: the § 1681c(b) use exception is off-report and unresolved, so a qualified PROBABLE (no VIOLATION) is preserved');

  const collectionNotBreach = runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Collection  Date of First Delinquency 01/01/2022']);
  check.equal(row(collectionNotBreach, 'FCRA-605A-4-US-NATIONAL-7Y').machine.outcome, 'PERIOD_NOT_EXCEEDED', 'D2: a recent delinquency is not exceeded');

  const collectionMissing = runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Collection  Date Placed 01/01/2022']);
  check.equal(row(collectionMissing, 'FCRA-605A-4-US-NATIONAL-7Y').machine.state, 'UNRESOLVED', 'D2: a collection-placement date is never substituted for the delinquency');

  /* The satisfied-judgment adapter is historical source material outside the active checklist. */
  const retiredJudgment = runEngine('US', 'US-NY', ['Experian Consumer Credit Report', 'Report Date: 12 June 2026', 'Judgment Date of Entry: 01/01/2010 Date Satisfied 01/01/2011']);
  check.equal(row(retiredJudgment, 'US-NY-GBL-380J-F1-II-JUDGMENT-5Y'), undefined,
    'a source-linked satisfied judgment cannot activate the retired public-record adapter');
  /* ===== D4: classification bounds ===== */
  const noBreach = ruleAdapters.runAdapter('FCRA-605A-5-US-NATIONAL-7Y', { country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT', facts: { 'reportedAccount.adverseRatingDate': '2024-06-01' }, referenceDate: '2026-10-01' });
  check.equal(noBreach.finding, null, 'D4: a not-exceeded period emits no finding');
  const missingFact = ruleAdapters.runAdapter('FCRA-605A-5-US-NATIONAL-7Y', { country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT', facts: {}, referenceDate: '2026-10-01' });
  check.ok(!missingFact.finding, 'D4: a missing fact emits no finding (parser silence is never a finding)');
  const wrongJurisdictionThrows = (() => { try { ruleAdapters.runAdapter('US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y', { country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT', facts: { 'publicRecord.bankruptcyOrderForReliefDate': '2010-01-01' }, referenceDate: '2026-10-01' }); return false; } catch (e) { return true; } })();
  check.equal(wrongJurisdictionThrows, true, 'D4: a wrong jurisdiction refuses rather than classifying');

  const incompleteObservation = ruleAdapters.runAdapter('FCRA-605A-2-US-NATIONAL-7Y', { country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT', facts: { 'publicRecord.judgmentEntryDate': '2010-01-01' }, referenceDate: '2026-10-01' });
  check.equal(incompleteObservation.state, 'EVALUATED', 'D4: the SOL-incomplete judgment still evaluates arithmetically');
  check.equal(incompleteObservation.finding, null, 'D4/ACCEPT-004: an incomplete observation emits no finding (no auto-probable from the SOL gap)');

  evidence.d2 = 'collection 180-day rule';
  evidence.d3 = 'satisfied-judgment adapter retired from active assessment';
  evidence.d4 = 'per-rule classification';
  return evidence;
}

module.exports = { run, id: 'ae-accept-003', title: 'ACCEPT-003 D1–D4: collection 180-day rule, satisfied-judgment condition, and per-rule classification' };
