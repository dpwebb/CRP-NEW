'use strict';
/**
 * ad-legal-event-facts.cjs — ACCEPT-002 §2. The previously blanket NOT_REPORT_EVIDENCED public-record limbs,
 * reassessed individually under OWNER-EVIDENCE-001: a clearly labelled legal-event date is now the reported
 * fact, and a semantically different label (a filing date) is never substituted.
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

async function run(t, check) {
  const evidence = {};

  /* ===== Judgment entry (FCRA § 605(a)(2), 7y) ===== */
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Judgment  Date of Entry: 01/01/2018']), 'FCRA-605A-2-US-NATIONAL-7Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED' }, 'judgment entry: >7y is PERIOD_EXCEEDED');
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Judgment  Date Entered 01/01/2022']), 'FCRA-605A-2-US-NATIONAL-7Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_NOT_EXCEEDED' }, 'judgment entry: <7y is PERIOD_NOT_EXCEEDED');
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Judgment  Filed 01/01/2018']), 'FCRA-605A-2-US-NATIONAL-7Y'),
    { state: 'UNRESOLVED', outcome: 'UNRESOLVED' }, 'a judgment filing date is not substituted for the date of entry (the check runs but its anchor is unresolved)');
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'PUBLIC RECORD: CIVIL JUDGMENT - Date of Entry: 01/01/2018']), 'FCRA-605A-2-US-NATIONAL-7Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED' }, 'judgment entry: equivalent layout yields the same comparison');

  /* ===== Tax lien paid (FCRA § 605(a)(3), 7y) ===== */
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Tax Lien  Date Released 01/01/2018']), 'FCRA-605A-3-US-NATIONAL-7Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED' }, 'tax lien paid: >7y is PERIOD_EXCEEDED');
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Tax Lien  Date Paid 01/01/2022']), 'FCRA-605A-3-US-NATIONAL-7Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_NOT_EXCEEDED' }, 'tax lien paid: <7y is PERIOD_NOT_EXCEEDED');
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Tax Lien  Filed 01/01/2018']), 'FCRA-605A-3-US-NATIONAL-7Y'),
    { state: 'UNRESOLVED', outcome: 'UNRESOLVED' }, 'a tax-lien filing date is not substituted for the date paid (the check runs but its anchor is unresolved)');

  /* ===== Bankruptcy order for relief / adjudication (FCRA § 605(a)(1), 10y) ===== */
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Order for Relief 01/01/2015']), 'FCRA-605A-1-US-NATIONAL-10Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED' }, 'order for relief: >10y is PERIOD_EXCEEDED');
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Adjudicated 01/01/2020']), 'FCRA-605A-1-US-NATIONAL-10Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_NOT_EXCEEDED' }, 'adjudication: <10y is PERIOD_NOT_EXCEEDED');
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Filed 01/01/2015']), 'FCRA-605A-1-US-NATIONAL-10Y'),
    { state: 'UNRESOLVED', outcome: 'UNRESOLVED' }, 'a bankruptcy filing date is not substituted for the order for relief or adjudication (the check runs but its anchor is unresolved)');

  /* ===== US-NY bankruptcy adjudication (14y) ===== */
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Adjudicated 01/01/2010']), 'US-NY-GBL-380J-F1-I-BANKRUPTCY-14Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED' }, 'US-NY adjudication: >14y is PERIOD_EXCEEDED');
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Adjudicated 01/01/2020']), 'US-NY-GBL-380J-F1-I-BANKRUPTCY-14Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_NOT_EXCEEDED' }, 'US-NY adjudication: <14y is PERIOD_NOT_EXCEEDED');

  /* ===== US-NY tax lien paid (7y) ===== */
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Tax Lien  Date Paid 01/01/2018']), 'US-NY-GBL-380J-F1-III-TAX-LIEN-PAID-7Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED' }, 'US-NY tax lien: >7y is PERIOD_EXCEEDED');

  /* ===== US-CA bankruptcy order for relief (10y) ===== */
  check.deepEqual(outcomeOf(runEngine('US', 'US-CA', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Order for Relief 01/01/2015']), 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED' }, 'US-CA order for relief: >10y is PERIOD_EXCEEDED');

  /* ===== US-CA tax lien paid (7y) — OWNER-CANDIDATE-005 ===== */
  check.deepEqual(outcomeOf(runEngine('US', 'US-CA', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Tax Lien  Date Paid 01/01/2018']), 'US-CA-CCRAA-1785-13-A-4-TAX-LIEN-PAID-7Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED' }, 'US-CA tax lien: >7y from the date paid is PERIOD_EXCEEDED');
  check.deepEqual(outcomeOf(runEngine('US', 'US-CA', ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Tax Lien  Date Paid 01/01/2022']), 'US-CA-CCRAA-1785-13-A-4-TAX-LIEN-PAID-7Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_NOT_EXCEEDED' }, 'US-CA tax lien: <7y from the date paid is PERIOD_NOT_EXCEEDED');

  /* ===== ACCEPT-003 D2/D3: the two formerly-withheld limbs are now reassessed ===== */
  const collection = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === 'FCRA-605A-4-US-NATIONAL-7Y');
  check.equal(collection.anchor_mode, 'SINGLE_FIELD', 'FCRA § 605(a)(4) is now anchored');
  check.deepEqual(collection.anchor_field, ['collection.delinquencyDate'], 'on the clearly labelled delinquency date');
  check.equal(collection.anchor_day_offset, 180, 'moved 180 days by § 605(c)(1)');
  const nyJudgment = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === 'US-NY-GBL-380J-F1-II-JUDGMENT-5Y');
  check.equal(nyJudgment.anchor_mode, 'SINGLE_FIELD', 'the US-NY satisfied-judgment limb is now anchored');
  check.deepEqual(nyJudgment.anchor_field, ['publicRecord.judgmentEntryDate'], 'on the entry date');
  check.equal(nyJudgment.condition_field, 'publicRecord.judgmentSatisfactionDate', 'with the satisfaction-within-five-years condition');

  /* A same-record contradiction on a legal-event fact is withheld. */
  const contradictoryEntry = formats.extractWithSharedAdapter(
    makeSyntheticModel({ pages: [['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Judgment  Date of Entry: 01/01/2018, Date Entered 02/02/2018']] }),
    { mode: 'REPORT', country: 'US' }
  );
  check.equal(contradictoryEntry.records.some((r) => r.facts && r.facts['publicRecord.judgmentEntryDate']), false,
    'two incompatible entry dates on the same judgment record are withheld');

  evidence.reassessed = [
    'FCRA-605A-2-US-NATIONAL-7Y', 'FCRA-605A-3-US-NATIONAL-7Y', 'FCRA-605A-1-US-NATIONAL-10Y',
    'US-NY-GBL-380J-F1-I-BANKRUPTCY-14Y', 'US-NY-GBL-380J-F1-III-TAX-LIEN-PAID-7Y', 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y'
  ];
  evidence.still_withheld = ['FCRA-605A-4-US-NATIONAL-7Y', 'US-NY-GBL-380J-F1-II-JUDGMENT-5Y'];
  return evidence;
}

module.exports = {
  run,
  id: 'ad-legal-event-facts',
  title: 'Reassessed public-record legal-event facts: judgment entry, tax lien paid, and bankruptcy order for relief / adjudication'
};

