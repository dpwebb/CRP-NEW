'use strict';
/** Consumer explanation: checklist requirement, two printed dates with source locations,
 * consistent card and assessment report, and a negative guard for retired bankruptcy findings. */
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
function renderUIFinding(renderedResult) {
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
  const result = renderedResult;
  vm.runInContext('state.view = { case: { country: "US", region: "US-CA" }, result: ' + JSON.stringify(result) + ', assessment_access: { complete_assessment: true, complete_assessment_via: "SUBSCRIPTION", assessment_download: true, dispute_packet: true, purchase_choices: [] }, assessment_summary: { result_id: "res_aw", created_at: "2026-10-05T00:00:00.000Z", distinct_total: 0, by_confidence: { violation: 0, probable_violation: 0, potential: 0 }, teaser: null, severity_order: ["REMOVE_ENTRY", "ADD_CONTENT", "INCONSISTENCY"] } }; state.step = 3; render();', ctx);
  return nodes.get('panel').innerHTML;
}
async function run(t, check) {
  const lines = [
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Creditor A  Balance $100  Opened 01/01/2020  Closed 01/01/2019'
  ];
  const result = render(lines);
  const issue = result.issues.find((i) => i.rule_assessment);
  check.ok(issue, 'the source-linked common-error card is produced');
  check.equal(issue.rule_assessment.classification, 'PROBABLE_VIOLATION');
  check.equal(issue.rule_assessment.requirement, 'An account cannot close before it opened.');
  check.deepEqual(issue.source_facts.map((f) => f.raw_value), ['01/01/2020', '01/01/2019']);
  check.deepEqual(issue.source_facts.map((f) => f.normalized_value), ['2020-01-01', '2019-01-01']);
  check.ok(issue.source_facts.every((f) => f.location.page === 1 && f.location.line === 3));
  check.ok(/which date needs correction/.test(issue.uncertainty), 'the card identifies the material uncertainty');
  check.equal(issue.citation, null, 'a statute is not a prerequisite for the report-data rule');
  const body = journey.assessmentReportBody(result, '2026-10-03T00:00:00.000Z');
  check.ok(/opened date later than its closed date/.test(body), 'the assessment report carries the same breach');
  check.ok(body.includes('01/01/2020') && body.includes('01/01/2019'), 'the report carries both raw dates');
  const ui = renderUIFinding(result);
  check.ok(/Reporting issue/.test(ui), 'the card uses consumer-facing reporting-issue wording');
  check.ok(/2020-01-01|01\/01\/2020/.test(ui), 'the card identifies a decisive date');
  check.ok(!/not legal advi[cs]e|INTERNAL_UNFINISHED_COMPARISON/.test(ui + body));
  const retired = render(VIOLATION_LINES);
  check.ok(!retired.issues.some((i) => i.adapter_id && /BANKRUPTCY/.test(i.adapter_id)),
    'the retired bankruptcy adapter cannot create a consumer issue');
  return { report_fact: 'two raw and normalized dates carry page and line provenance',
    rule_basis: 'a defined chronology requirement supports the violation without a mandatory statute',
    consistency: 'consumer card and assessment report agree on the same source-linked issue' };
}

module.exports = { run, id: 'aw-consumer-explanations', title: 'BLOCKER-EXPLANATIONS-001: why-this-was-flagged cards (report_fact, rule_basis, uncertainty, consistency)' };

