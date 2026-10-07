'use strict';
// Retained source extraction, with retired statutory output excluded from version 1.
const generalIntake = require('../../general-intake.cjs');
const evaluation = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const scope = require('../../common-error-scope.cjs');
const { SUPPORT } = require('../../formats.cjs');
const RETIRED = 'CA-MB-PIA-S4-E-JUDGMENT-CONTENT-OMISSION';
const REGION = 'CA-MB';
function assess(lines) {
  const records = generalIntake.buildRecords([{ lines: lines.map((text, i) => ({ text, trusted: true, page: 1, line: i + 1 })) }], null);
  const extraction = { presentation_id: 'GENERAL-BUREAU-REPORT', records,
    reference_date: { normalized_value: '2026-06-12' }, support: SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT };
  const assessed = evaluation.evaluateCase({ country: 'CA', region: REGION, presentation: extraction.presentation_id, extraction });
  const cards = issues.issuesFor({ evaluation: assessed, extraction });
  return { records, assessed, cards };
}
async function run(t, check) {
  check.equal(scope.activeAdapter(RETIRED), false, 'historical adapter is outside the active common-error checklist');
  const caseResult = assess(['Public Record: JDG-001', 'Judgment', 'Creditor: Fictional Finance', 'Creditor Address: 1 Main St', 'Amount:']);
  const record = caseResult.records.find((item) => item.kind === 'GENERAL_PUBLIC_RECORD');
  check.ok(record, 'the bounded public record remains readable by the general intake');
  check.equal(record.facts['judgment.amountState'], 'UNRESOLVED', 'the printed field remains a source fact');
  check.equal(caseResult.assessed.results.some((row) => row.check.adapter_id === RETIRED), false,
    'historical adapter does not run even when its source predicate is printed');
  check.equal(caseResult.assessed.unavailable_checks.some((row) => row.adapter_id === RETIRED), false,
    'historical adapter is absent from active unavailable-check counts');
  check.equal(caseResult.cards.some((card) => card.adapter_id === RETIRED || JSON.stringify(card.supported_bases || []).includes(RETIRED)), false,
    'historical adapter cannot become a selectable consumer issue');
  const empty = assess(['Equifax  Consumer Credit Report', 'Fictional Creditor  Balance $100']);
  check.equal(empty.assessed.results.some((row) => row.check.adapter_id === RETIRED), false,
    'an unrelated account also cannot revive the adapter');
  return { retired_adapter: RETIRED, source_extraction_retained: true, consumer_output_suppressed: true };
}
module.exports = { run, id: 'ci-ca-mb-judgment-content', title: 'Owner common-error scope: CA-MB historical judgment adapter retired from active assessment' };
