'use strict';
// Historical bankruptcy source remains readable; its adapter is outside the checklist.
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const scope = require('../../common-error-scope.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const RETIRED = 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y';
function assess(lines) {
  const extraction = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [lines] }), { mode: 'REPORT', country: 'US' });
  const assessed = evaluation.evaluateCase({ country: 'US', region: 'US-CA', extraction });
  return { extraction, assessed, cards: issues.issuesFor({ evaluation: assessed, extraction }) };
}
async function run(t, check) {
  check.equal(scope.activeAdapter(RETIRED), false, 'bankruptcy retention is outside the active checklist');
  const one = assess(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Date of Order for Relief: 01/01/2010']);
  check.ok(one.extraction.records.some((record) => /PUBLIC_RECORD/.test(record.kind)), 'the source public record is still extracted');
  check.equal(one.assessed.results.some((row) => row.check.adapter_id === RETIRED), false, 'retired adapter never evaluates');
  check.equal(one.cards.some((card) => card.adapter_id === RETIRED || card.citation && /bankruptcy/i.test(card.citation)), false,
    'the public-record date yields no retired consumer allegation');
  const two = assess(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026',
    'Bankruptcy  Date of Order for Relief: 01/01/2010', 'Bankruptcy  Date of Order for Relief: 01/01/2005']);
  check.equal(two.assessed.results.some((row) => row.check.adapter_id === RETIRED), false, 'two records cannot revive the retired adapter');
  check.equal(two.cards.some((card) => card.adapter_id === RETIRED), false, 'two records cannot create retired packet choices');
  return { retired_adapter: RETIRED, public_record_extraction_retained: true, consumer_findings: 0 };
}
module.exports = { run, id: 'as-gap-finding-004', title: 'Owner common-error scope: bankruptcy source remains readable without an out-of-list finding' };
