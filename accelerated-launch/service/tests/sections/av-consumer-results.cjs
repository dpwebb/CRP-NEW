'use strict';
/**
 * av-consumer-results.cjs — BLOCKER-RESULTS-001 (prioritized action list). The consumer result surface
 * (results.cjs renderResultSet) orders deterministically, gives plain-English reasons that distinguish
 * observations from findings, qualifies unresolved issues (never presents them as proven), and keeps
 * internal machine identifiers out of the consumer-visible fields.
 */
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

  /* 1. An ordinary expired order-for-relief date derives a VIOLATION finding with plain-English reasons. */
  const violation = render([
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Bankruptcy Public Record: TEST-BK-003',
    'Order for Relief: January 1, 2011'
  ]);
  const finding = violation.observations.find((o) => o.is_a_finding && o.classification === 'VIOLATION');
  check.ok(finding, 'an observation is a finding when the report prints a determinable violation');
  check.equal(finding.classification, 'VIOLATION', 'the finding classification is explicit');
  check.ok(typeof finding.headline === 'string' && finding.headline.length > 0, 'a finding has a plain-English headline');
  check.ok(typeof finding.detail === 'string' && finding.detail.length > 0, 'a finding has a plain-English detail');
  check.ok(typeof finding.qualification === 'string' && finding.qualification.length > 0, 'a finding carries a qualification sentence');

  /* 2. Reasons distinguish observations from findings. */
  const observations = violation.observations;
  check.ok(observations.some((o) => o.is_a_finding === true), 'findings are marked as findings');
  check.ok(observations.some((o) => o.is_a_finding === false), 'non-finding observations are marked separately');
  check.ok(observations.every((o) => typeof o.check_name === 'string' && o.check_name.length > 0), 'every observation names the check it performed');

  /* 3. Prioritization is deterministic and never an arbitrary ranking claim. */
  const again = render([
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Bankruptcy Public Record: TEST-BK-003',
    'Order for Relief: January 1, 2011'
  ]);
  check.deepEqual(again.observations.map((o) => o.check_name), observations.map((o) => o.check_name), 'the same report yields the same deterministic ordering');
  for (const o of observations) {
    check.equal(Object.prototype.hasOwnProperty.call(o, 'rank'), false, 'no arbitrary rank field is claimed');
    check.equal(Object.prototype.hasOwnProperty.call(o, 'score'), false, 'no arbitrary score field is claimed');
  }

  /* 4. Uncertainty: unresolved issues are qualified, never presented as proven. */
  const unresolved = render([
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Bankruptcy Public Record: TEST-BK-006',
    'Order for Relief: January 1, 2011',
    'Order for Relief: March 5, 2013'
  ]);
  check.ok(unresolved.observations.every((o) => o.is_a_finding === false), 'conflicting dates withhold the finding (uncertainty, not proven)');
  check.ok(unresolved.unresolved_report_fields.length > 0, 'the unresolved printed field is reported beside its account');
  check.ok(unresolved.reading_limitations && unresolved.reading_limitations.never_equates_unread_with_absence === true, 'unread content is never equated with absence');

  /* 5. Isolation: internal machine identifiers never reach the consumer-visible fields. */
  const consumerVisible = observations.map((o) => ({ check_name: o.check_name, headline: o.headline, detail: o.detail, classification: o.classification }));
  check.ok(!/adapter_id|presentation_id|source_entry_id/.test(JSON.stringify(consumerVisible)), 'internal adapter/presentation identifiers never leak into the consumer-visible result');
  check.equal(violation.comprehensive_legal_check, false, 'the surface never claims a comprehensive legal check');
  check.ok(/checks listed/i.test(violation.disclaimer) && !/not legal advi[cs]e/i.test(JSON.stringify(violation)), 'the result states its actual scope without a legal-advice disclaimer');

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
  evidence.reasons = 'plain-English headline/detail/qualification; findings (is_a_finding) distinguished from observations';
  evidence.uncertainty = 'conflicting dates withhold the finding; unread content never equated with absence';
  evidence.isolation = 'internal machine identifiers never reach consumer-visible result fields; no comprehensive-legal-check claim';
  return evidence;
}

module.exports = { run, id: 'av-consumer-results', title: 'BLOCKER-RESULTS-001: prioritized action list (deterministic, plain-English, qualified, isolated)' };
