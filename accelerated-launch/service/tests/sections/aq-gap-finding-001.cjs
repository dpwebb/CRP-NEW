'use strict';
/**
 * aq-gap-finding-001.cjs — OWNER-GAP-FINDING-001 (revised after the GAP-FINDING-002 revisit). Rule-specific
 * exceptions are evaluated only from facts the report positively establishes, and kept explicitly unresolved
 * otherwise — never by inferring absence or distinctness the report does not evidence.
 *
 * The CA-NS `second-bankruptcy` exception is now recorded off-report: a "second bankruptcy" requires a
 * DISTINCT bankruptcy event identity (a separate case/court), and the extraction produces only discharge
 * dates. Two listings of the SAME bankruptcy across bureaus can print different discharge dates, so distinct
 * dates alone do not establish distinct events. The exception therefore stays unresolved in every case.
 */

const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const generalIntake = require('../../general-intake.cjs');
const evaluation = require('../../evaluation.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const NS = 'CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y';
const FCRA = 'FCRA-605A-1-US-NATIONAL-10Y';

function distinctDates(lines) {
  const ext = generalIntake.extract(makeSyntheticModel({ pages: [lines] }), { country: 'CA' });
  return evaluation.bankruptcyDischargeDates(ext.records);
}

function nsException() {
  const r = ruleAdapters.runAdapter(NS, {
    country: 'CA', region: 'CA-NS', presentation: 'PR-01',
    referenceDate: '2026-06-12', facts: { 'bankruptcy.dischargeDate': '2015-01-01' }
  });
  return r.evaluation.exceptions.items.find((i) => i.id === 'second-bankruptcy');
}

async function run(t, check) {
  const evidence = {};

  /* 1. The exception is recorded off-report: distinct discharge dates do not establish distinct events. */
  const adapter = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === NS);
  check.equal(adapter.exceptions.items.find((i) => i.id === 'second-bankruptcy').report_observable, false,
    'second-bankruptcy is recorded off-report (event identity not extractable)');

  /* 2. Demonstrated defect: the SAME bankruptcy across two bureaus printing DIFFERENT discharge dates yields
        two distinct dates — but that is NOT proof of two distinct events. */
  const crossBureau = distinctDates([
    'Equifax Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy #12345 Discharged 01/01/2020',
    'TransUnion Consumer Credit Report', 'Bankruptcy #12345 Discharged 15/02/2020'
  ]);
  check.deepEqual(crossBureau, ['2020-01-01', '2020-02-15'],
    'same-bankruptcy cross-bureau copies with different dates would yield two distinct dates (the ambiguity)');

  /* 3. The exception stays unresolved regardless — distinct dates are never proof of a second bankruptcy. */
  const exc = nsException();
  check.equal(exc.applies, null, 'second-bankruptcy stays unresolved (never resolved from discharge dates)');
  check.equal(exc.resolved, false, 'second-bankruptcy is not defaulted to false');

  /* 4. A single discharge, duplicate listings and conflicting readings all stay unresolved. */
  check.deepEqual(distinctDates(['Equifax Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy Discharged 01/01/2020']), ['2020-01-01'], 'one discharge extracts');
  check.deepEqual(distinctDates(['Equifax Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy Discharged 01/01/2020, Discharged 02/02/2020']), [], 'a contradictory reading is withheld');

  /* 5. Off-report FCRA § 1681c(b) exceptions stay unresolved and block a finding. */
  const fc = ruleAdapters.runAdapter(FCRA, {
    country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT',
    referenceDate: '2026-10-01', facts: { 'publicRecord.bankruptcyOrderForReliefDate': '2010-01-01' }
  });
  check.equal(fc.state, 'EVALUATED', 'FCRA bankruptcy limb evaluates');
  check.equal(fc.outcome, 'PERIOD_EXCEEDED', 'FCRA bankruptcy limb period exceeded');
  check.equal(fc.finding, null, 'FCRA bankruptcy: the off-report § 1681c(b) use exception blocks a finding');

  /* 6. The classifier never defaults unknown to false. */
  const evaluationRecord = ruleAdapters.buildEvaluationRecord(ruleAdapters.runAdapter(NS, {
    country: 'CA', region: 'CA-NS', presentation: 'PR-01', referenceDate: '2026-06-12',
    facts: { 'bankruptcy.dischargeDate': '2015-01-01' },
    fact_sources: {
      'bankruptcy.dischargeDate': {
        raw_value: '01/01/2015', normalized_value: '2015-01-01',
        location: { page: 1, line: 3, section: 'synthetic' },
        normalization: { from: '01/01/2015', to: '2015-01-01' },
        uncertainty: { status: 'RESOLVED', reason: null, precision: 'DAY' }
      }
    }
  }), adapter);
  check.equal(ruleAdapters.classifyEvaluation(Object.assign({}, evaluationRecord, {
    exceptions: { evaluation_required: true, items: [{ id: 'second-bankruptcy', applies: null, resolved: false }] }
  }), 'violation'), null, 'an unresolved exception yields no finding (withheld, not false)');

  evidence.defect = 'same bankruptcy across bureaus with different dates yields two distinct dates, but distinct dates do not establish distinct events';
  evidence.fix = 'second-bankruptcy is recorded off-report and stays unresolved (event identity not extractable)';
  evidence.off_report = 'FCRA § 1681c(b) use exceptions stay unresolved and block a finding';
  return evidence;
}

module.exports = { run, id: 'aq-gap-finding-001', title: 'GAP-FINDING-001: exceptions stay unresolved where the report cannot establish event identity or completeness' };

