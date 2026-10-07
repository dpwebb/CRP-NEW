'use strict';
/**
 * af-accept-004.cjs — OWNER-ACCEPT-004 (correction round 2). A permission ceiling CAPS, never SELECTS, a
 * finding class. The class is derived from a COMPLETE per-assessment legal-evaluation record built from the
 * adapter's actual predicates (anchor, condition, reference date) and recorded exceptions. An incomplete
 * record — missing jurisdiction, rule identity, required resolved fact, reference date, timing, a resolved
 * condition, or an explicitly resolved exception evaluation — yields no finding. A nonempty
 * decisive_facts_unavailable list must carry per-entry identity, decisiveness and evidence of genuine
 * unavailability, or it is refused.
 */

const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

function engineRun(adapterId, facts, referenceDate, region) {
  /* GAP-FINDING-004: a declared synthetic fact still carries a source link, so a synthetic evaluation can
     derive a finding under the source-linked gate. The location is explicitly synthetic, never a real page
     coordinate. */
  const factSources = {};
  for (const field of Object.keys(facts || {})) {
    const raw = facts[field];
    factSources[field] = {
      raw_value: raw, normalized_value: raw,
      location: { page: 1, line: 1, section: 'synthetic declared fact', synthetic: true },
      normalization: { from: raw, to: raw },
      uncertainty: { status: 'RESOLVED', reason: null, precision: 'DAY' }
    };
  }
  return ruleAdapters.runAdapter(adapterId, {
    country: 'US', region: region || 'US-NY', presentation: 'GENERAL-BUREAU-REPORT',
    facts, fact_sources: factSources, referenceDate: referenceDate || '2026-10-01'
  });
}

function runEngine(region, lines) {
  const model = makeSyntheticModel({ pages: [lines] });
  const ext = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'US' });
  return evaluation.evaluateCase({ country: 'US', region, extraction: ext });
}
function pipelineRow(result, adapterId) {
  return result.results.find((r) => r.check.adapter_id === adapterId && r.machine && r.machine.state === 'EVALUATED');
}
function pipelineAny(result, adapterId) {
  return result.results.filter((r) => r.check.adapter_id === adapterId);
}

/** A real evaluation record, derived from a resolved CA state breach through runAdapter (a rule with no
 *  recorded cross-referenced exception in its admitted text, so a complete record derives VIOLATION). */
function baseEvaluation() {
  const breach = engineRun('US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y', { 'publicRecord.bankruptcyOrderForReliefDate': '2010-01-01' }, '2026-10-01', 'US-CA');
  const adapter = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y');
  return ruleAdapters.buildEvaluationRecord(breach, adapter);
}

async function run(t, check) {
  const evidence = {};

  /* The class is derived from the record, capped by the ceiling. */
  check.equal(ruleAdapters.classifyEvaluation(baseEvaluation(), 'violation'), 'VIOLATION',
    'a complete record + breach derives VIOLATION');
  check.equal(ruleAdapters.classifyEvaluation(baseEvaluation(), 'observation'), null,
    'an observation ceiling caps a derived violation to none (the ceiling never selects)');

  /* Missing breach determination -> no finding. */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { breach_established: false }), 'violation'), null,
    'no breach determination yields no finding');

  /* Incomplete observation -> no finding. */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { observation_incomplete: true }), 'violation'), null,
    'an incomplete observation yields no finding');

  /* Missing jurisdiction -> no finding. */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { selected_jurisdiction: {} }), 'violation'), null,
    'a missing jurisdiction yields no finding');

  /* Missing rule identity -> no finding. */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { rule_identity: { adapter_id: 'x' } }), 'violation'), null,
    'an incomplete rule identity yields no finding');

  /* Missing required fact -> no finding. */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { required_facts: [{ field: 'publicRecord.bankruptcyOrderForReliefDate', role: 'anchor', resolved: false, iso: null }] }), 'violation'), null,
    'an unresolved required fact yields no finding');

  /* Missing reference date -> no finding. */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { reference_date: { resolved: false, iso: null } }), 'violation'), null,
    'an unresolved reference date yields no finding');

  /* Missing timing -> no finding. */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { timing: null }), 'violation'), null,
    'missing timing yields no finding');

  /* Unresolved condition -> no finding. */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { conditions: [{ field: 'x', resolved: false, met: false }] }), 'violation'), null,
    'an unresolved condition yields no finding');

  /* Missing exception evaluation -> no finding (not silently cleared). */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { exceptions: undefined }), 'violation'), null,
    'a missing exception evaluation yields no finding');

  /* Empty exception items without an explicit evaluation_required -> no finding. */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { exceptions: { items: [] } }), 'violation'), null,
    'an empty exception list without an explicit no-exception determination yields no finding');

  /* Known applicable exception -> no finding. */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { exceptions: { evaluation_required: true, items: [{ id: 'second-bankruptcy', applies: true, resolved: true }] } }), 'violation'), null,
    'a known applicable exception prevents breach');

  /* Unresolved exception -> no finding; not defaulted to false, not auto-probable. */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { exceptions: { evaluation_required: true, items: [{ id: 'second-bankruptcy', applies: null, resolved: false }] } }), 'violation'), null,
    'an unresolved exception yields no finding, never an auto-probable');

  /* A genuinely unavailable decisive fact (full identity) -> PROBABLE, capped by the ceiling. */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { decisive_facts_unavailable: [{ identity: 'a second bankruptcy is not determinable from the report', decisive: true, unavailable_from_resolved_reading: true, evidence: 'the report prints no second-bankruptcy record' }] }), 'violation'), 'PROBABLE_VIOLATION',
    'a fully evidenced decisive fact derives PROBABLE, capped by the violation ceiling');

  /* An arbitrary / incomplete decisive fact list is refused. */
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { decisive_facts_unavailable: [{ identity: 'x' }] }), 'violation'), null,
    'an arbitrary decisive-fact entry (no decisiveness/evidence) is refused, not probable');
  check.equal(ruleAdapters.classifyEvaluation(Object.assign(baseEvaluation(), { decisive_facts_unavailable: ['a second bankruptcy'] }), 'violation'), null,
    'a string decisive-fact list is refused, not probable');

  /* Runtime: the SOL-incomplete judgment is an incomplete observation, never a finding. */
  const incomplete = engineRun('FCRA-605A-2-US-NATIONAL-7Y', { 'publicRecord.judgmentEntryDate': '2010-01-01' });
  check.equal(incomplete.state, 'EVALUATED', 'the SOL-incomplete judgment still evaluates arithmetically');
  check.equal(incomplete.finding, null, 'runtime: an incomplete observation emits no finding');

  /* Runtime: the FCRA federal rule carries the § 1681c(b) use exception (off-report, unresolved). */
  const federal = engineRun('FCRA-605A-1-US-NATIONAL-10Y', { 'publicRecord.bankruptcyOrderForReliefDate': '2010-01-01' });
  check.equal(federal.state, 'EVALUATED', 'runtime: the federal bankruptcy rule still evaluates arithmetically');
  check.equal(federal.outcome, 'PERIOD_EXCEEDED', 'runtime: its ten-year period is exceeded');
  check.equal(federal.finding && federal.finding.classification, 'PROBABLE_VIOLATION', 'runtime: the unresolved § 1681c(b) use exception blocks VIOLATION (qualified PROBABLE preserved)');
  const fedEval = ruleAdapters.buildEvaluationRecord(federal, ruleAdapters.ADAPTERS.find((a) => a.adapter_id === 'FCRA-605A-1-US-NATIONAL-10Y'));
  check.equal(fedEval.exceptions.evaluation_required, true, 'runtime: the federal rule records the § 1681c(b) exception');
  check.equal(fedEval.exceptions.items.length, 3, 'runtime: it records the three exempted-use cases (credit / insurance / employment)');
  check.equal(fedEval.exceptions.unresolved_exception_present, true, 'runtime: the exception is unresolved, never defaulted to false');

  /* Runtime: the NY state rule records the § 380-j(f)(2) use exception (off-report, unresolved). */
  const ny = engineRun('US-NY-GBL-380J-F1-I-BANKRUPTCY-14Y', { 'publicRecord.bankruptcyAdjudicationDate': '2010-01-01' });
  check.equal(ny.state, 'EVALUATED', 'runtime: the NY bankruptcy rule still evaluates arithmetically');
  check.equal(ny.outcome, 'PERIOD_EXCEEDED', 'runtime: its fourteen-year period is exceeded');
  check.equal(ny.finding && ny.finding.classification, 'PROBABLE_VIOLATION', 'runtime: the unresolved § 380-j(f)(2) use exception blocks VIOLATION');
  const nyEval = ruleAdapters.buildEvaluationRecord(ny, ruleAdapters.ADAPTERS.find((a) => a.adapter_id === 'US-NY-GBL-380J-F1-I-BANKRUPTCY-14Y'));
  check.equal(nyEval.exceptions.evaluation_required, true, 'runtime: the NY rule records the § 380-j(f)(2) exception');
  check.equal(nyEval.exceptions.items.length, 3, 'runtime: it records the three use cases (credit / life insurance / employment)');

  /* Runtime: a CA state breach (no cross-referenced exception in its admitted text) derives VIOLATION. */
  const breach = engineRun('US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y', { 'publicRecord.bankruptcyOrderForReliefDate': '2010-01-01' }, '2026-10-01', 'US-CA');
  check.equal(breach.finding.classification, 'VIOLATION', 'runtime: a resolved CA state breach derives VIOLATION');
  check.equal(breach.finding.evaluation.exceptions.evaluation_required, false, 'runtime: the CA rule records no cross-referenced exception in its admitted text');

  /* Runtime: missing source evidence (parser silence) emits no finding. */
  const missing = engineRun('FCRA-605A-1-US-NATIONAL-10Y', {});
  check.ok(!missing.finding, 'runtime: missing source evidence emits no finding (parser silence is never a finding)');

  /* Runtime: an altered fact (not-exceeded) emits no finding. */
  const noBreach = engineRun('FCRA-605A-5-US-NATIONAL-7Y', { 'reportedAccount.adverseRatingDate': '2024-06-01' });
  check.equal(noBreach.finding, null, 'runtime: a not-exceeded period emits no finding');

  /* Runtime: wrong jurisdiction refuses rather than classifying. */
  let wrongRefused = false;
  try {
    ruleAdapters.runAdapter('US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y', {
      country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT',
      facts: { 'publicRecord.bankruptcyOrderForReliefDate': '2010-01-01' }, referenceDate: '2026-10-01'
    });
  } catch (e) { wrongRefused = true; }
  check.equal(wrongRefused, true, 'runtime: wrong jurisdiction refuses rather than classifying');

  /* The single guarded finding path. */
  let refused = false;
  try { ruleAdapters.emitFinding(noBreach, ruleAdapters.ADAPTERS.find((a) => a.adapter_id === 'FCRA-605A-5-US-NATIONAL-7Y')); }
  catch (e) { refused = true; }
  check.equal(refused, true, 'emitFinding refuses when no finding is derived');
  const emitted = ruleAdapters.emitFinding(breach, ruleAdapters.ADAPTERS.find((a) => a.adapter_id === 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y'));
  check.equal(emitted.classification, 'VIOLATION', 'emitFinding returns the derived finding through the single guarded path');


  /* The direct classifier remains a unit-level historical primitive. Runtime assessment must
     exclude public-record adapters that are outside the active common-error checklist. */
  const fullReport = runEngine('US-NY', [
    'Experian Consumer Credit Report', 'Report Date: 12 June 2026',
    'Bankruptcy Date of Order for Relief: 01/01/2010', 'Judgment Date of Entry: 01/01/2010'
  ]);
  check.equal(pipelineRow(fullReport, 'FCRA-605A-1-US-NATIONAL-10Y'), undefined,
    'federal bankruptcy does not enter active runtime assessment');
  check.equal(pipelineRow(fullReport, 'FCRA-605A-2-US-NATIONAL-7Y'), undefined,
    'federal judgment does not enter active runtime assessment');
  const caReport = runEngine('US-CA', [
    'Experian Consumer Credit Report', 'Report Date: 12 June 2026',
    'Bankruptcy Date of Order for Relief: 01/01/2010'
  ]);
  check.equal(pipelineRow(caReport, 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y'), undefined,
    'California bankruptcy does not enter active runtime assessment');
  evidence.classification = 'derived-from-complete-record, capped-by-ceiling';
  evidence.federal_exception = 'historical direct adapter retained; runtime public-record adapter retired';
  evidence.ny_violation = 'public-record statutory adapters excluded from runtime';
  return evidence;
}

module.exports = { run, id: 'af-accept-004', title: 'ACCEPT-004: classification is derived from a complete evaluation record and capped by the ceiling' };

