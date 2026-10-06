'use strict';
/**
 * br-qualified-assessment.cjs — OWNER-POTENTIAL-ISSUE-001 / Branch B: the qualified (potential/probable)
 * assessment path is kept SEPARATE from definite legal proof.
 *
 * Proved here:
 *   - a retention rule whose period IS exceeded but whose recorded exception cannot be resolved from the report
 *     derives PROBABLE_VIOLATION (a factual verification request), never VIOLATION, and the unknown exception is
 *     disclosed as the decisive fact unavailable;
 *   - benign controls: an in-period date, a missing anchor (missing information alone is not a finding) and the
 *     California (a)(8) rule (finding_allowed: false) all yield no finding;
 *   - the strict definite classifier is preserved (an ordinary expired order-for-relief stays VIOLATION).
 */
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

function fc605a5(lines) {
  const ext = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [lines] }), { mode: 'REPORT', country: 'US' });
  const res = evaluation.evaluateCase({ country: 'US', region: 'US-NY', extraction: ext });
  const row = res.results.find((r) => r.check.adapter_id === 'FCRA-605A-5-US-NATIONAL-7Y');
  return { ext, res, row };
}

async function run(service, check) {
  const evidence = {};

  /* ---- 1. Qualified positive: period exceeded + unresolved § 1681c(b) exception -> PROBABLE, never VIOLATION. ---- */
  const positive = fc605a5(['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Account 30 days past due as of Jun 2015']);
  check.ok(positive.row, 'the adverse-rating rule runs');
  check.equal(positive.row.machine.outcome, 'PERIOD_EXCEEDED', 'with the retention period exceeded');
  check.equal(positive.row.machine.finding.classification, 'PROBABLE_VIOLATION', 'an unresolved exception derives PROBABLE, never VIOLATION');
  check.equal(positive.row.machine.finding.decisive_fact_unavailable, 'exception:credit-transaction-150k', 'and the unresolved exception is named exactly');
  check.ok(positive.row.machine.finding.decisive_facts.every((d) => d.unavailable_from_resolved_reading === true), 'each unresolved exception is a decisive fact unavailable from a resolved reading');

  /* The same case surfaces as a consumer PROBABLE issue with a verification request and the benign alternatives. */
  const posIssues = issues.issuesFor({ evaluation: positive.res, extraction: positive.ext }).filter((i) => i.adapter_id === 'FCRA-605A-5-US-NATIONAL-7Y');
  check.equal(posIssues.length, 1, 'the qualified concern becomes one consumer issue');
  check.equal(posIssues[0].request_type, 'VERIFICATION', 'as a verification request (never a correction)');
  check.ok(/cannot be determined from your report/.test(posIssues[0].explanation), 'stating the exception cannot be determined');
  check.ok(/credit transaction involving \$150,000/.test(posIssues[0].uncertainty), 'naming the benign alternative (a permitted use)');
  check.ok(/not an established one/.test(posIssues[0].uncertainty), 'staying probable, never established');
  /* OWNER correction (Batch 25): the consumer text leads with the approved probable sentence and then the
     exception this report cannot establish — never a claim that a value was unreadable. */
  check.ok(posIssues[0].uncertainty.startsWith(issues.PROBABLE_LEAD), 'the probable issue leads with the approved sentence');
  check.ok(!/could not be read|not readable|unreadable/i.test(posIssues[0].uncertainty), 'and the unestablished exception is never described as a reading failure');
  check.ok(/cannot be established from the report itself/.test(posIssues[0].uncertainty), 'followed by the specific exception uncertainty');

  /* ---- 2. Benign: an in-period date yields no finding. ---- */
  const inPeriod = fc605a5(['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Account 30 days past due as of Jun 2022']);
  check.equal(inPeriod.row.machine.finding, null, 'an in-period adverse date yields no finding');

  /* ---- 3. Benign: missing information alone is not a finding. ---- */
  const missing = fc605a5(['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026']);
  check.ok(!missing.row || missing.row.machine.finding === null, 'a missing anchor yields no finding (missing information is not a concern)');

  /* ---- 4. California (a)(8) stays disabled: finding_allowed false is never restored by the qualified path. ---- */
  const caA8 = ruleAdapters.runAdapter('US-CA-CCRAA-1785-13-A-8-ADVERSE-7Y', {
    country: 'US', region: 'US-CA', presentation: 'GENERAL-BUREAU-REPORT',
    facts: { 'reportedAccount.adverseRatingDate': '2015-06', 'reportedAccount.adverseRatingDatePrecision': 'MONTH' },
    fact_sources: { 'reportedAccount.adverseRatingDate': { raw_value: 'Jun 2015', normalized_value: '2015-06', location: { page: 1, line: 1 }, normalization: { from: 'Jun 2015', to: '2015-06' } } },
    referenceDate: '2026-10-01'
  });
  check.equal(caA8.finding, null, 'California (a)(8) stays disabled as a definite violation');
  check.equal(caA8.finding_emitted, false, 'and emits no finding through the qualified path');

  /* ---- 5. The strict definite classifier is preserved (ordinary expired order-for-relief stays VIOLATION). ---- */
  const defExt = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Bankruptcy Public Record: TEST-BK', 'Order for Relief: January 1, 2011']] }), { mode: 'REPORT', country: 'US' });
  const defRes = evaluation.evaluateCase({ country: 'US', region: 'US-CA', extraction: defExt });
  const defRow = defRes.results.find((r) => r.check.adapter_id === 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y');
  check.equal(defRow.machine.finding.classification, 'VIOLATION', 'an ordinary expired order-for-relief stays a definite VIOLATION');

  evidence.qualified = 'period exceeded + unresolved exception -> PROBABLE verification request, never VIOLATION';
  evidence.definite_preserved = 'the strict definite classifier is unchanged';
  return evidence;
}

module.exports = {
  run,
  id: 'br-qualified-assessment',
  title: 'OWNER-POTENTIAL-ISSUE-001 Branch B: separate qualified assessment (unresolved exception -> PROBABLE)'
};
