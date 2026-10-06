'use strict';
/**
 * aw-consumer-explanations.cjs — BLOCKER-EXPLANATIONS-001 (why-this-was-flagged cards). Through the real
 * extraction -> evaluation -> rendering pipeline, the consumer-facing explanation carries the exact raw
 * printed fact + normalization + owning source location (report_fact), the applicable citation + admitted
 * source version (rule_basis), and for a probable finding the named unavailable decisive fact without
 * presenting breach as established (uncertainty). The downloaded assessment report agrees with the on-screen
 * result (consistency), and missing/conflicting evidence never produces a misleading explanation.
 */
const vm = require('node:vm');
const path = require('node:path');
const fs = require('node:fs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const results = require('../../results.cjs');
const journey = require('../../journey.cjs');
const issues = require('../../issues.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

function render(lines) {
  const ext = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [lines] }), { mode: 'REPORT', country: 'US' });
  const ev = evaluation.evaluateCase({ country: 'US', region: 'US-CA', extraction: ext });
  return results.renderResultSet({ evaluation: ev, extraction: ext });
}

const VIOLATION_LINES = [
  'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
  'Report Date: June 12, 2026',
  'Bankruptcy Public Record: TEST-BK-003',
  'Order for Relief: January 1, 2011'
];

const PROBABLE_LINES = [
  'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
  'Report Date: June 12, 2026',
  'Bankruptcy Public Record: TEST-BK-001',
  'Order for Relief: January 1, 2011',
  'Historical verification for TEST-BK-001: the Order for Relief date above is the reported date; its correspondence to the actual court order is unverified and cannot be established from this disclosure.'
];

/* A minimal node:vm context (mirroring k-ui-smoke.cjs) to render the consumer UI card for a finding. */
function renderUIFinding(observation) {
  const nodes = new Map();
  const element = (id) => {
    if (!nodes.has(id)) nodes.set(id, { id, innerHTML: '', textContent: '', className: '', value: '', disabled: false, style: {}, dataset: {}, files: [], onclick: null, onchange: null, scrollIntoView() {}, querySelectorAll: () => [], querySelector: () => null });
    return nodes.get(id);
  };
  const ctx = {
    console, setTimeout, clearTimeout, JSON, Object, Array, Map, Set, Promise, Number, String, Date, Error, RegExp,
    crypto: { randomUUID: () => 'ui-uuid-1234567890' },
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '{}' }),
    document: { getElementById: element, createElement: () => element('anon'), modelContext: undefined },
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
    Blob: class Blob {},
    FileReader: class FileReader { readAsDataURL() { this.result = 'data:x'; if (this.onload) this.onload(); } }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.window.location = { assign: () => {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'ui', 'app.js'), 'utf8'), ctx);
  const result = {
    support: 'ACTUAL_REPORT_EVIDENCE',
    presentation_evidence: true,
    jurisdiction: { country: 'US', region: 'US-CA' },
    checks_performed: 1,
    observations: [observation],
    report_consistency_checks: [],
    unresolved_report_fields: [{plain:'INTERNAL_INCOMPLETE_READING',raw_reading:'INTERNAL_UNACCEPTED_VALUE'}],
    checks_not_run: [],
    checks_unresolved: [{plain:'INTERNAL_UNCOMPLETED_CHECK'}],
    checks_not_applicable: [],
    checks_not_examinable: [],
    assessment: { plain: 'This assessment contains one recorded rule comparison.' },
    qualifications: ['These are observations from your report, not legal findings.'],
    disclaimer: 'This assessment covers the checks listed in this report.'
  };
  vm.runInContext('state.view = { case: { country: "US", region: "US-CA" }, result: ' + JSON.stringify(result) + ', assessment_access: { complete_assessment: true, complete_assessment_via: "SUBSCRIPTION", assessment_download: true, dispute_packet: true, purchase_choices: [] }, assessment_summary: { result_id: "res_aw", created_at: "2026-10-05T00:00:00.000Z", distinct_total: 0, by_confidence: { violation: 0, probable_violation: 0, potential: 0 }, teaser: null, severity_order: ["REMOVE_ENTRY", "ADD_CONTENT", "INCONSISTENCY"] } }; state.step = 3; render();', ctx);
  return nodes.get('panel').innerHTML;
}
async function run(t, check) {
  const evidence = {};

  /* 1. report_fact — exact raw printed value, normalization and owning source location. */
  const violation = render(VIOLATION_LINES);
  const vFinding = violation.observations.find((o) => o.is_a_finding && o.check_name && o.check_name.indexOf('1785.13') !== -1);
  check.ok(vFinding, 'an ordinary expired order-for-relief date renders a finding');
  check.equal(vFinding.rule_source.raw_value, 'January 1, 2011', 'the exact raw printed fact is surfaced');
  check.deepEqual(vFinding.rule_source.normalization, { from: 'January 1, 2011', to: '2011-01-01' }, 'the normalization step is surfaced');
  check.equal(vFinding.rule_source.location.page, 1, 'the owning source page is surfaced');
  check.equal(vFinding.rule_source.location.line, 4, 'the owning source line is surfaced');

  /* 2. rule_basis — applicable citation and admitted source version. */
  check.ok(vFinding.check_name.indexOf('1785.13') !== -1, 'the applicable rule citation is surfaced');
  check.match(vFinding.rule_source_version, /^[0-9A-F]{64}$/, 'the admitted source version digest is surfaced');

  /* 3. uncertainty — a VIOLATION is established (resolved); a PROBABLE names the unavailable decisive fact. */
  check.equal(vFinding.classification, 'VIOLATION', 'the established internal classification is explicit');
  check.equal(vFinding.consumer_label, 'Reporting issue', 'the consumer label is the plain reporting-issue wording');
  check.ok(vFinding.detail.indexOf('established reporting issue') !== -1, 'the established explanation agrees with the classification');
  check.equal(vFinding.decisive_facts_unavailable, null, 'a resolved finding has no unavailable decisive fact');

  const probable = render(PROBABLE_LINES);
  const pFinding = probable.observations.find((o) => o.is_a_finding && o.check_name && o.check_name.indexOf('1785.13') !== -1);
  check.equal(pFinding.classification, 'PROBABLE_VIOLATION', 'the probable internal classification is explicit');
  check.equal(pFinding.consumer_label, 'Probable reporting issue', 'the probable consumer label preserves the uncertainty wording');
  check.ok(Array.isArray(pFinding.decisive_facts_unavailable) && pFinding.decisive_facts_unavailable.length > 0, 'a probable finding names its unavailable decisive fact');
  check.equal(pFinding.decisive_facts_unavailable[0].identity, 'publicRecord.bankruptcyOrderForReliefDate.historical_correspondence', 'the unavailable decisive fact is named exactly');
  check.ok(pFinding.qualification.indexOf('probable reporting issue') !== -1, 'the probable qualification says probable');
  check.ok(pFinding.qualification.indexOf('established reporting issue') === -1, 'a probable finding never presents the issue as established');
  /* OWNER correction (Batch 25): the probable lead is the approved sentence, it never claims something was
     unreadable, and the issue's own specific uncertainty follows it on the same finding. */
  check.equal(pFinding.qualification, issues.PROBABLE_LEAD, 'the probable finding carries the approved lead sentence exactly');
  check.ok(!/readable|could not be read/i.test(pFinding.qualification), 'and never describes the uncertainty as a reading failure');
  check.ok(/has not been verified against the court event/.test(pFinding.detail), 'the specific unverified-fact uncertainty follows it on the same finding');
  check.ok(/cannot be established from this report/.test(pFinding.detail), 'stating exactly what the report cannot establish');

  /* 4. consistency — the downloaded assessment report agrees with the on-screen result. */
  const vBody = journey.assessmentReportBody(violation, '2026-10-03T00:00:00.000Z');
  check.ok(vBody.indexOf(vFinding.check_name) !== -1, 'the report carries the same rule citation');
  check.ok(vBody.indexOf(vFinding.rule_source_version) !== -1, 'the report carries the same source version');
  check.ok(vBody.indexOf('January 1, 2011') !== -1 && vBody.indexOf('2011-01-01') !== -1, 'the report carries the same raw fact and normalization');
  check.ok(/established reporting issue/.test(vBody), 'the report agrees with the VIOLATION classification');
  const pBody = journey.assessmentReportBody(probable, '2026-10-03T00:00:00.000Z');
  check.ok(/probable/.test(pBody) && /unverified/.test(pBody), 'the report agrees with the PROBABLE classification and its material unknown');

  /* 5. Missing/conflicting evidence never produces a misleading explanation. */
  const withheld = render([
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Bankruptcy Public Record: TEST-BK-006',
    'Order for Relief: January 1, 2011',
    'Order for Relief: March 5, 2013'
  ]);
  check.ok(withheld.observations.every((o) => !o.is_a_finding), 'conflicting dates withhold the finding');
  check.ok(withheld.observations.every((o) => !o.qualification || o.qualification.indexOf('established reporting issue') === -1), 'a withheld check never claims an established reporting issue');

  /* 6. The on-screen card renders the classification, source fact, rule version and decisive fact. */
  const ui = renderUIFinding(vFinding);
  check.ok(/Reporting issue/.test(ui), 'the on-screen card labels the consumer reporting-issue wording');
  check.ok(/Rule version/.test(ui), 'the on-screen card shows the rule version');
  check.ok(/Source fact/.test(ui) && /January 1, 2011/.test(ui) && /2011-01-01/.test(ui), 'the on-screen card shows the raw fact and normalization');
  const pui = renderUIFinding(pFinding);
  check.ok(/Probable reporting issue/.test(pui), 'the on-screen card labels the probable consumer wording');
  check.ok(/Decisive fact unavailable/.test(pui), 'the on-screen card names the unavailable decisive fact');
  check.ok(pui.indexOf(issues.PROBABLE_LEAD) !== -1, 'the on-screen card shows the approved probable lead sentence');
  check.ok(!/could not be read|not readable/i.test(pui), 'and the card never calls the uncertainty a reading failure');
  check.ok(!/not legal advi[cs]e/i.test(ui+pui+vBody+pBody), 'owner imperative: finding UI and reports have no legal-advice disclaimer');
  check.ok(!/INTERNAL_INCOMPLETE_READING|INTERNAL_UNCOMPLETED_CHECK|INTERNAL_UNACCEPTED_VALUE/.test(ui+pui), 'owner imperative: incomplete finding qualifications stay internal');
  check.ok(!/LIMITATIONS AND QUALIFICATIONS|READING WAS INCOMPLETE|COULD NOT BE READ CONFIDENTLY/.test(vBody+pBody), 'owner imperative: downloaded reports omit incomplete-check qualification sections');
  check.ok(!/PROBABLE VIOLATION\s*—\s*NOT A LEGAL FINDING/.test(pui), 'owner imperative: probable finding is not labelled a non-finding');
  const incomplete = { ...vFinding, assessment_completed: false, headline: 'INTERNAL_UNFINISHED_COMPARISON' };
  const emptyUI = renderUIFinding(incomplete);
  check.ok(!/INTERNAL_UNFINISHED_COMPARISON/.test(emptyUI) && /No findings available/.test(emptyUI) && !/fully compliant|no violations/i.test(emptyUI), 'owner imperative: incomplete comparison stays internal and empty results do not assert compliance');

  evidence.report_fact = 'exact raw printed value, normalization and owning page/line location are surfaced';
  evidence.rule_basis = 'the applicable citation and the admitted source-version digest are surfaced';
  evidence.uncertainty = 'a probable finding names its unavailable decisive fact and never presents breach as established';
  evidence.consistency = 'the downloaded assessment report agrees with the on-screen result on fact, rule and classification';
  evidence.missing_or_misassociated = 'conflicting evidence withholds the finding and never claims an established violation';
  return evidence;
}

module.exports = { run, id: 'aw-consumer-explanations', title: 'BLOCKER-EXPLANATIONS-001: why-this-was-flagged cards (report_fact, rule_basis, uncertainty, consistency)' };

