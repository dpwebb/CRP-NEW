'use strict';
/**
 * ad-legal-event-facts.cjs — historical public-record source configuration and current runtime scope.
 * Legal-event dates remain parseable, but independent public-record statutory limbs are retired
 * from version 1 assessment because they are outside the active common-error checklist.
 *
 *   • judgment entry  -> FCRA-605A-2-US-NATIONAL-7Y
 *   • tax lien paid    -> FCRA-605A-3-US-NATIONAL-7Y, US-NY-GBL-380J-F1-III-TAX-LIEN-PAID-7Y
 *   • order for relief -> FCRA-605A-1-US-NATIONAL-10Y (priority chain), US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y
 *   • adjudication     -> FCRA-605A-1-US-NATIONAL-10Y (priority chain), US-NY-GBL-380J-F1-I-BANKRUPTCY-14Y
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
function outcomeOf(result, adapterId) {
  const row = result.results.find((r) => r.check.adapter_id === adapterId);
  return row ? { state: row.machine.state, outcome: row.machine.outcome } : null;
}

const RETIRED_PUBLIC_RECORD_ADAPTERS = new Set([
  'FCRA-605A-1-US-NATIONAL-10Y', 'FCRA-605A-2-US-NATIONAL-7Y', 'FCRA-605A-3-US-NATIONAL-7Y',
  'US-NY-GBL-380J-F1-I-BANKRUPTCY-14Y', 'US-NY-GBL-380J-F1-III-TAX-LIEN-PAID-7Y',
  'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y', 'US-CA-CCRAA-1785-13-A-4-TAX-LIEN-PAID-7Y'
]);

async function run(t, check) {
  const evidence = {};

  /* These legal-event fields remain parseable. Their public-record statutes are outside the
     active common-error checklist, so no outcome from one may enter runtime assessment. */
  for (const adapterId of RETIRED_PUBLIC_RECORD_ADAPTERS) {
    const result = runEngine('US', adapterId.startsWith('US-CA') ? 'US-CA' : 'US-NY', [
      'Experian Consumer Credit Report', 'Report Date: 12 June 2026',
      'Judgment Date of Entry: 01/01/2010', 'Tax Lien Date Paid: 01/01/2010',
      'Bankruptcy Order for Relief: 01/01/2010', 'Bankruptcy Adjudicated: 01/01/2005'
    ]);
    check.equal(outcomeOf(result, adapterId), null, `${adapterId}: retired public-record adapter has no runtime outcome`);
  }

  /* ===== ACCEPT-003 D2/D3: the two formerly-withheld limbs are now reassessed ===== */
  const collection = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === 'FCRA-605A-4-US-NATIONAL-7Y');
  check.equal(collection.anchor_mode, 'SINGLE_FIELD', 'FCRA § 605(a)(4) is now anchored');
  check.deepEqual(collection.anchor_field, ['collection.delinquencyDate'], 'on the clearly labelled delinquency date');
  check.equal(collection.anchor_day_offset, 180, 'moved 180 days by § 605(c)(1)');
  const nyJudgment = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === 'US-NY-GBL-380J-F1-II-JUDGMENT-5Y');
  check.equal(nyJudgment.anchor_mode, 'SINGLE_FIELD', 'the historical NY judgment adapter retains its source configuration');
  check.deepEqual(nyJudgment.anchor_field, ['publicRecord.judgmentEntryDate'], 'on the entry date');
  check.equal(nyJudgment.condition_field, 'publicRecord.judgmentSatisfactionDate', 'with the satisfaction-within-five-years condition');

  /* A same-record contradiction on a legal-event fact is withheld. */
  const contradictoryEntry = formats.extractWithSharedAdapter(
    makeSyntheticModel({ pages: [['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Judgment  Date of Entry: 01/01/2018, Date Entered 02/02/2018']] }),
    { mode: 'REPORT', country: 'US' }
  );
  check.equal(contradictoryEntry.records.some((r) => r.facts && r.facts['publicRecord.judgmentEntryDate']), false,
    'two incompatible entry dates on the same judgment record are withheld');

  evidence.retired_from_runtime = [
    'FCRA-605A-2-US-NATIONAL-7Y', 'FCRA-605A-3-US-NATIONAL-7Y', 'FCRA-605A-1-US-NATIONAL-10Y',
    'US-NY-GBL-380J-F1-I-BANKRUPTCY-14Y', 'US-NY-GBL-380J-F1-III-TAX-LIEN-PAID-7Y', 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y'
  ];
  evidence.active_collection = ['FCRA-605A-4-US-NATIONAL-7Y'];
  return evidence;
}

module.exports = {
  run,
  id: 'ad-legal-event-facts',
  title: 'Public-record dates remain source facts while retired statutory limbs stay outside assessment'
};

