'use strict';
/** Consumer results: source-linked checklist issues, deterministic order, plain explanation,
 * internal identifier isolation, and no invented finding for correct chronology. */
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const results = require('../../results.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

function render(lines) {
  const ext = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [lines] }), { mode: 'REPORT', country: 'US' });
  const ev = evaluation.evaluateCase({ country: 'US', region: 'US-CA', extraction: ext });
  return results.renderResultSet({ evaluation: ev, extraction: ext });
}

async function run(t, check) {
  const evidence = {};

  /* A source-linked checklist chronology breach reaches the consumer result. */
  const lines = [
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Creditor A  Balance $100  Opened 01/01/2020  Closed 01/01/2019'
  ];
  const violation = render(lines);
  const issue = violation.issues.find((i) => i.rule_assessment);
  check.ok(issue, 'the result contains the sourced common-error violation');
  check.equal(issue.rule_assessment.classification, 'PROBABLE_VIOLATION');
  check.equal(issue.basis_type, 'FACTUAL_CONSISTENCY');
  check.ok(/opened date later than its closed date/.test(issue.explanation));
  check.equal(issue.source_facts.length, 2, 'both decisive printed dates are linked');
  check.ok(issue.source_facts.every((f) => f.location && f.location.page === 1 && f.location.line === 3));
  check.ok(!violation.observations.some((o) => o.is_a_finding), 'no retired statutory observation is revived');

  const again = render(lines);
  check.deepEqual(again.issues.map((i) => i.issue_id), violation.issues.map((i) => i.issue_id),
    'the same source yields deterministic issue ordering and identity');
  check.ok(violation.issues.every((i) => !Object.hasOwn(i, 'rank') && !Object.hasOwn(i, 'score')),
    'the issue list claims no arbitrary ranking score');
  const benign = render([
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Creditor A  Balance $100  Opened 01/01/2018  Closed 01/01/2020'
  ]);
  check.ok(!benign.issues.some((i) => i.rule_assessment), 'correct chronology creates no violation');
  check.ok(!/adapter_id|presentation_id|source_entry_id/.test(JSON.stringify(violation.issues)),
    'internal adapter and presentation identifiers are absent from consumer issues');
  check.equal(violation.comprehensive_legal_check, false);
  check.ok(/checks listed/i.test(violation.disclaimer) && !/not legal advi[cs]e/i.test(JSON.stringify(violation)));

  /* 6. OWNER correction (Batch 25): a value that genuinely could not be read is named as a reading failure, and
     an uncertainty that is not a reading failure never borrows that language. A probable finding carries the
     approved lead sentence instead of the retired generic claim. */
  const unreadable = results.plainStatement({ state: 'UNRESOLVED' }, null, 1, 'account');
  check.match(unreadable.headline, /could not be read/, 'a value that could not be read is described as a reading failure');
  check.match(unreadable.detail, /not the same as a date that is absent/, 'and read failure is distinguished from absence');
  check.ok(!/probable reporting issue/i.test(`${unreadable.headline} ${unreadable.detail}`), 'a reading failure is never turned into a probable issue');
  const probableMachine = { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED', arithmetic: { period_years: 7 }, finding: { classification: 'PROBABLE_VIOLATION' } };
  const probablePlain = results.plainStatement(probableMachine, null, 1, 'account');
  check.ok(!/readable|could not be read/i.test(`${probablePlain.headline} ${probablePlain.detail}`), 'a probable finding never calls its uncertainty a reading failure');
  check.match(probablePlain.headline, /unverified/, 'and names its own specific uncertainty (an unverified correspondence)');
  const definitePlain = results.plainStatement(Object.assign({}, probableMachine, { finding: { classification: 'VIOLATION' } }), null, 1, 'account');
  check.ok(/printed date exceeds the reporting period/.test(definitePlain.detail), 'the finding states the decisive date comparison without a tier label');
  check.ok(!/probable/i.test(definitePlain.detail), 'and never carries the probable lead');

  evidence.prioritization = 'deterministic evidence-backed ordering; no arbitrary rank/score field';
  evidence.reasons = 'plain-English source-linked common-error explanation and decisive facts';
  evidence.uncertainty = 'correct chronology does not create a violation; read failure remains separate';
  evidence.isolation = 'internal machine identifiers never reach consumer-visible result fields; no comprehensive-legal-check claim';
  return evidence;
}

module.exports = { run, id: 'av-consumer-results', title: 'BLOCKER-RESULTS-001: prioritized action list (deterministic, plain-English, qualified, isolated)' };
