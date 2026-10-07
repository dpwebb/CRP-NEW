'use strict';
// Active date-conflict checks remain; judgment-content adapters are retired.
const generalIntake = require('../../general-intake.cjs');
const evaluation = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const scope = require('../../common-error-scope.cjs');
const { SUPPORT } = require('../../formats.cjs');
const ACTIVE = {
  'CA-BC': 'CA-BC-BPCPA-S109-1-B-MOST-RELIABLE-EVIDENCE',
  'CA-QC': 'CA-QC-P-39-1-S11-ACCURACY',
  'CA-SK': 'CA-SK-CRA-S18-B-MOST-RELIABLE-EVIDENCE'
};
const RETIRED = {
  'CA-NB': 'CA-NB-CRSA-S10-3-F-JUDGMENT-CONTENT-OMISSION',
  'CA-SK': 'CA-SK-CRA-S18-J-JUDGMENT-CONTENT-OMISSION'
};
function assess(region, lines) {
  const records = generalIntake.buildRecords([{ lines: lines.map((text, i) => ({ text, trusted: true, page: 1, line: i + 1 })) }], null);
  const extraction = { presentation_id: 'GENERAL-BUREAU-REPORT', records,
    reference_date: { normalized_value: '2026-06-12' }, support: SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT };
  const assessed = evaluation.evaluateCase({ country: 'CA', region, presentation: extraction.presentation_id, extraction });
  return { records, assessed, cards: issues.issuesFor({ evaluation: assessed, extraction }) };
}
const conflict = ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026',
  'Fictional Creditor  Balance $100  Opened 01/01/2020  Closed 01/01/2019'];
const consistent = ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026',
  'Fictional Creditor  Balance $100  Opened 01/01/2019  Closed 01/01/2020'];
const judgment = ['Public Record: JDG-901', 'Judgment', 'Creditor: MARITIME HOLDINGS',
  'Creditor Address: 12 Main St'];
async function run(t, check) {
  for (const [region, adapterId] of Object.entries(ACTIVE)) {
    check.equal(scope.activeAdapter(adapterId), true, region + ': date-conflict support remains in scope');
    const positive = assess(region, conflict);
    check.equal(positive.assessed.results.filter((row) => row.check.adapter_id === adapterId).length, 1,
      region + ': active accuracy adapter runs for a printed date contradiction');
    check.equal(positive.cards.length, 1, region + ': one consumer issue is shown for one contradiction');
    check.equal(positive.cards[0].eligible, true, region + ': the issue remains packet selectable');
    check.ok(positive.cards[0].source_facts && positive.cards[0].source_facts.length >= 2,
      region + ': the issue retains both printed date readings');
    check.equal(assess(region, consistent).cards.length, 0, region + ': consistent dates create no issue');
  }
  for (const [region, adapterId] of Object.entries(RETIRED)) {
    check.equal(scope.activeAdapter(adapterId), false, region + ': judgment-content adapter is retired');
    const result = assess(region, judgment);
    const record = result.records.find((item) => item.kind === 'GENERAL_PUBLIC_RECORD');
    check.ok(record && record.facts['judgment.recordIdentified'], region + ': judgment remains source readable');
    check.equal(result.assessed.results.some((row) => row.check.adapter_id === adapterId), false,
      region + ': out-of-list judgment adapter never evaluates');
    check.equal(result.assessed.unavailable_checks.some((row) => row.adapter_id === adapterId), false,
      region + ': it is absent from active unavailable-check counts');
    check.equal(result.cards.some((card) => card.adapter_id === adapterId || JSON.stringify(card.supported_bases || []).includes(adapterId)), false,
      region + ': no retired judgment consumer card or packet choice');
  }
  return { active_regions: Object.keys(ACTIVE), retired_judgment_regions: Object.keys(RETIRED) };
}
module.exports = { run, id: 'cl-bc-qc-nb-finish',
  title: 'Owner common-error scope: BC, QC and SK date conflicts active; NB and SK judgment adapters retired' };
