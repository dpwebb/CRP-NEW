'use strict';
/**
 * bg-report-use.cjs — OWNER-REPORT-USE-POLICY-001 (corrected): the report-use clarification is fail-closed.
 *
 * A single-purpose statement resolves ONLY the purpose it names; the other use-exception items stay UNRESOLVED,
 * so a generic purpose and low amount can NEGATE an exempted use (no finding) but can never unlock a violation.
 * This section proves the submission-combination boundary, the negation-only resolution, report/event context,
 * reassessment from the original assembled extraction, answer correction, review invalidation, footer placement
 * and the wizard purpose → conditional amount → save interaction.
 */

const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const reportUse = require('../../../adapters/report-use.cjs');
const journey = require('../../journey.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const FCRA_BK = 'FCRA-605A-1-US-NATIONAL-10Y';
const NY_BK = 'US-NY-GBL-380J-F1-I-BANKRUPTCY-14Y';

function sourceOf(iso) {
  return { raw_value: iso, normalized_value: iso, location: { page: 1, line: 3, section: 'synthetic' }, normalization: { from: iso, to: iso }, uncertainty: { status: 'RESOLVED', reason: null, precision: 'DAY' } };
}

function runUse(adapter, facts, statement) {
  const factSources = Object.fromEntries(Object.keys(facts).map((k) => [k, sourceOf(facts[k])]));
  return ruleAdapters.runAdapter(adapter, {
    country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT', referenceDate: '2026-10-01',
    facts, fact_sources: factSources, consumer_statements: [statement]
  });
}

function itemState(result, id) {
  const item = result.evaluation.exceptions.items.find((i) => i.id === id);
  return item ? { applies: item.applies, resolved: item.resolved } : null;
}

function combine(purposeItems, amountItems) {
  return reportUse.combineSubmission(purposeItems || [], amountItems || []);
}

function uploadBody(bytes, filename) {
  return { originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') };
}

function bankruptcyPdf() {
  return buildPdf({ pages: [{ lines: [
    'Experian Consumer Credit Report',
    'Report Date: June 12, 2026',
    'Bankruptcy Public Record: TEST-BK-RU-001',
    'Order for Relief: January 1, 2011'
  ] }] });
}

async function run(t, check) {
  const evidence = {};
  const fcBk = { 'publicRecord.bankruptcyOrderForReliefDate': '2010-01-01' };
  const nyBk = { 'publicRecord.bankruptcyAdjudicationDate': '2005-01-01' };

  /* 1. The question names the specific report and offers only the three exempted-use purposes. */
  const q = reportUse.question({ bureau: 'Experian', reference_date: '2026-06-12' });
  check.ok(/Experian credit report dated 2026-06-12/.test(q.plain), 'the question names the particular report (bureau + reference date)');
  check.ok(/not why you obtained a copy to review/.test(q.benefit), 'the benefit distinguishes furnishing use from a personal disclosure');
  check.deepEqual(q.choices.sort(), ['credit_transaction', 'employment', 'life_insurance_underwriting'].sort(), 'only the three exempted-use categories are offered');
  check.equal(q.has_dont_know, true, "I don't know is a first-class answer");
  check.equal(q.has_skip, true, 'Skip is a first-class answer');
  check.deepEqual(q.amount_bands.credit_transaction.map((b) => b.label), ['Less than $50,000', '$50,000 to $149,999', '$150,000 or more'], 'amount bands use accurate inclusive threshold wording');

  /* 2. The three reproduced combineSubmission defects. */
  check.equal(combine([{ question_id: 'report-use', answer: 'credit_transaction' }, { question_id: 'report-use', answer: 'credit_transaction', multiple_uses: true }], [{ question_id: 'report-use-amount', purpose: 'credit_transaction', answer: 'below_50k' }]).answer, 'MULTIPLE_USES', 'a multiple_uses flag on any purpose fragment is not discarded');
  check.equal(combine([{ question_id: 'report-use', answer: 'credit_transaction' }], [{ question_id: 'report-use-amount', purpose: 'credit_transaction', answer: 'below_50k' }, { question_id: 'report-use-amount', purpose: 'credit_transaction', answer: 'at_least_150k' }]).answer, 'CONTRADICTORY', 'conflicting amounts for one purpose are contradictory, not first-wins');
  check.equal(combine([{ question_id: 'report-use', answer: 'credit_transaction' }], [{ question_id: 'report-use-amount', purpose: 'life_insurance_underwriting', answer: 'below_50k' }]).answer, 'CONTRADICTORY', 'an amount tagged with a different purpose is rejected');

  /* 3. Negation-only resolution: a single-purpose statement resolves only the purpose it names. */
  const below = runUse(FCRA_BK, fcBk, combine([{ question_id: 'report-use', answer: 'credit_transaction' }], [{ question_id: 'report-use-amount', purpose: 'credit_transaction', answer: 'below_50k' }]));
  check.equal(below.finding && below.finding.classification, 'PROBABLE_VIOLATION', 'credit below $50,000 does NOT unlock a violation (other uses unresolved; probable only)');
  check.equal(itemState(below, 'credit-transaction-150k').applies, false, 'the named credit item resolves below-threshold');
  check.equal(itemState(below, 'life-insurance-150k').applies, null, 'the life-insurance item stays unresolved, never false');
  check.equal(itemState(below, 'employment-75k').applies, null, 'the employment item stays unresolved, never false');

  const exempted = runUse(FCRA_BK, fcBk, combine([{ question_id: 'report-use', answer: 'credit_transaction' }], [{ question_id: 'report-use-amount', purpose: 'credit_transaction', answer: 'at_least_150k' }]));
  check.equal(exempted.finding, null, 'credit $150,000 or more negates (exception applies → no finding)');
  check.equal(itemState(exempted, 'credit-transaction-150k').applies, true, 'the named credit item resolves at-threshold');

  /* 4. New York thresholds differ: $50,000. */
  check.equal(itemState(runUse(NY_BK, nyBk, combine([{ question_id: 'report-use', answer: 'credit_transaction' }], [{ question_id: 'report-use-amount', purpose: 'credit_transaction', answer: 'at_least_50k_below_150k' }])), 'credit-transaction-50k').applies, true, 'NY credit $50,000–$149,999 is $50,000 or more → applies');
  check.equal(itemState(runUse(NY_BK, nyBk, combine([{ question_id: 'report-use', answer: 'credit_transaction' }], [{ question_id: 'report-use-amount', purpose: 'credit_transaction', answer: 'below_50k' }])), 'credit-transaction-50k').applies, false, 'NY credit below $50,000 → does not apply');

  /* 5. Life insurance and employment thresholds. */
  check.equal(itemState(runUse(FCRA_BK, fcBk, combine([{ question_id: 'report-use', answer: 'life_insurance_underwriting' }], [{ question_id: 'report-use-amount', purpose: 'life_insurance_underwriting', answer: 'at_least_150k' }])), 'life-insurance-150k').applies, true, 'federal life insurance ≥ $150,000 applies');
  check.equal(itemState(runUse(FCRA_BK, fcBk, combine([{ question_id: 'report-use', answer: 'employment' }], [{ question_id: 'report-use-amount', purpose: 'employment', answer: 'at_least_75k' }])), 'employment-75k').applies, true, 'federal employment ≥ $75,000 applies');
  check.equal(itemState(runUse(NY_BK, nyBk, combine([{ question_id: 'report-use', answer: 'employment' }], [{ question_id: 'report-use-amount', purpose: 'employment', answer: 'at_least_25k_below_75k' }])), 'employment-25k').applies, true, 'NY employment ≥ $25,000 applies');

  /* 6. Personal review / malformed purposes are not purposes. */
  for (const bad of ['personal_review', 'other', 'garbage']) {
    const st = reportUse.validateAnswer({ question_id: 'report-use', answer: bad });
    check.equal(st.valid, false, `${bad} is rejected, never a resolved purpose`);
    const badRes = runUse(FCRA_BK, fcBk, st);
    check.equal(badRes.finding && badRes.finding.classification, 'PROBABLE_VIOLATION', `${bad} leaves the finding probable, never a violation`);
  }

  /* 7. Multiple-use flag and unknown/skip never become false. */
  check.equal(reportUse.validateAnswer({ question_id: 'report-use', answer: 'credit_transaction', multiple_uses: true }).answer, 'MULTIPLE_USES', 'an explicit multiple_uses flag is honored');
  for (const answer of ['I_DONT_KNOW', 'SKIP']) {
    const r = runUse(FCRA_BK, fcBk, reportUse.validateAnswer({ question_id: 'report-use', answer }));
    check.equal(r.finding && r.finding.classification, 'PROBABLE_VIOLATION', `${answer} leaves the finding probable, never a violation`);
    check.ok(r.evaluation.exceptions.items.every((i) => i.applies === null && i.resolved === false), `${answer} leaves every exception item unresolved`);
  }

  /* 8. Conflicting purposes and a purpose without its material amount stay unresolved. */
  check.equal(combine([{ question_id: 'report-use', answer: 'credit_transaction' }, { question_id: 'report-use', answer: 'employment' }], []).answer, 'CONTRADICTORY', 'conflicting purposes are contradictory');
  check.equal(itemState(runUse(FCRA_BK, fcBk, combine([{ question_id: 'report-use', answer: 'credit_transaction' }], [])), 'credit-transaction-150k').applies, null, 'a purpose without its material amount stays unresolved');

  /* 8b. The exception evaluation is linked to the exact authoritative statement and policy identity/version. */
  const boundStmt = combine([{ question_id: 'report-use', answer: 'credit_transaction' }], [{ question_id: 'report-use-amount', purpose: 'credit_transaction', answer: 'at_least_150k' }]);
  boundStmt.statement_id = 'stmt_test_123';
  const linked = runUse(FCRA_BK, fcBk, boundStmt);
  const linkedItem = linked.evaluation.exceptions.items.find((i) => i.id === 'credit-transaction-150k');
  check.equal(linkedItem.statement_id, 'stmt_test_123', 'the resolved exception item links to the exact statement identity');
  check.equal(linkedItem.policy.policy_id, 'OWNER-REPORT-USE-POLICY-001', 'the resolved exception item links to the policy identity');
  check.equal(linkedItem.policy.version, '1.0', 'the resolved exception item links to the policy version');

  /* 9. HTTP: combined-file reassessment preserves the original assembled extraction and reference date. */
  const owner = await t.account('report-use-owner@example.test');
  const caseRow = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  const pdfA = buildPdf({ pages: [{ lines: ['Experian Consumer Credit Report', 'Report Date: June 12, 2026', 'Bankruptcy Public Record: TEST-BK-RU-001', 'Order for Relief: January 1, 2011'] }] });
  await t.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: owner.token, body: uploadBody(pdfA, 'bankruptcy.pdf') });
  const evalRes = (await t.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: owner.token })).json;
  check.ok(!(evalRes.result.observations || []).some((o) => o.is_a_finding === true && o.classification === 'VIOLATION'), 'before the answer, no definite violation (a probable concern may surface)');

  const viewBefore = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  check.ok(Array.isArray(viewBefore.clarification_questions), 'the view carries a clarification-questions array');
  check.equal((viewBefore.clarification_questions || []).some((c) => c.id === 'report-use'), false,
    'no report-use question is surfaced for the retired bankruptcy adapter');

  /* Review, then submit a statement directly (no surfaced question) to prove the storage machinery is retained. */
  await t.request('POST', `/api/cases/${caseRow.case_id}/review`, { token: owner.token });
  const reviewedView = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  check.equal(reviewedView.reviewed, true, 'the consumer has reviewed the result');

  const clarify = (await t.request('POST', `/api/cases/${caseRow.case_id}/results/${evalRes.result_id}/clarify`, { token: owner.token, body: { answers: [
    { question_id: 'report-use', answer: 'credit_transaction' },
    { question_id: 'report-use-amount', purpose: 'credit_transaction', answer: 'below_50k' }
  ] } })).json;
  check.equal(clarify.reassessed, false, 'a stored report-use statement does not reassess an out-of-checklist rule');

  const viewAfter = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  check.ok(!(viewAfter.result.observations || []).some((o) => o.is_a_finding === true && o.classification === 'VIOLATION'), 'after a below-threshold statement the exception is still unresolved (no violation unlocked)');
  check.equal(viewAfter.reviewed, true, 'without a material reassessment the prior review remains valid');
  const stored = viewAfter.clarifications.find((c) => c.question_id === 'report-use' && !c.superseded);
  check.ok(stored && stored.report_identity && stored.report_identity.bureau === 'Experian', 'the statement binds the report identity (bureau) server-side');
  check.ok(stored && stored.report_identity && stored.report_identity.reference_date === '2026-06-12', 'the statement binds the report reference date server-side');
  check.ok(stored && Array.isArray(stored.report_file_ids) && stored.report_file_ids.length > 0, 'the statement binds the report file ids');
  check.ok(stored && typeof stored.statement_id === 'string' && stored.statement_id.startsWith('stmt_'), 'the statement carries its identity');
  check.ok(stored && stored.furnishing_context && stored.furnishing_context.established === false, 'the furnishing event context is retained as unknown, not an adapter-id identity');
  check.ok(stored && stored.policy_id === 'OWNER-REPORT-USE-POLICY-001' && stored.policy_version === '1.0', 'the statement binds the policy identity and version');
  check.ok(stored && stored.recorded_at, 'the statement carries its timestamp');

  /* Answer correction supersedes without dropping provenance (the storage machinery is retained even though the
     question is not surfaced). */
  await t.request('POST', `/api/cases/${caseRow.case_id}/results/${evalRes.result_id}/clarify`, { token: owner.token, body: { answers: [
    { question_id: 'report-use', answer: 'credit_transaction' },
    { question_id: 'report-use-amount', purpose: 'credit_transaction', answer: 'at_least_150k' }
  ] } });
  const viewCorrected = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  const reportUseAnswers = viewCorrected.clarifications.filter((c) => c.question_id === 'report-use');
  check.equal(reportUseAnswers.filter((c) => c.superseded === true).length, 1, 'the superseded statement is retained');
  check.equal(reportUseAnswers.filter((c) => c.superseded !== true).length, 1, 'exactly one active report-use statement remains');

  /* 10. A later upload is never incorporated into the stored statement's file binding. */
  const latePdf = buildPdf({ pages: [{ lines: ['TransUnion Consumer Credit Report', 'Report Date: June 12, 2026', 'Bankruptcy Public Record: TEST-BK-LATE', 'Order for Relief: January 1, 2009'] }] });
  await t.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: owner.token, body: uploadBody(latePdf, 'late.pdf') });
  const lateView = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  const lateStored = lateView.clarifications.find((c) => c.question_id === 'report-use' && !c.superseded);
  check.equal(lateStored.report_file_ids.length, 1, 'the stored statement still binds only the originally assessed file, not the later upload');

  /* 11. Same-owner separate reports are isolated. */
  const case2 = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  await t.request('POST', `/api/cases/${case2.case_id}/files`, { token: owner.token, body: uploadBody(pdfA, 'bankruptcy.pdf') });
  await t.request('POST', `/api/cases/${case2.case_id}/evaluate`, { token: owner.token });
  const view2 = (await t.request('GET', `/api/cases/${case2.case_id}`, { token: owner.token })).json.view;
  check.ok(!(view2.result.observations || []).some((o) => o.is_a_finding === true && o.classification === 'VIOLATION'), 'a separate report with no answer still has no violation (no cross-report reuse)');

  /* 11b. The stored statement binds every assembled file and retains the original reference date. */
  const multiCase = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  const pageB = buildPdf({ pages: [{ lines: ['Experian Consumer Credit Report', 'Report Date: June 12, 2026', 'Account  Balance $1,000  Opened 01/01/2020'] }] });
  await t.request('POST', `/api/cases/${multiCase.case_id}/files`, { token: owner.token, body: uploadBody(pdfA, 'page-a.pdf') });
  await t.request('POST', `/api/cases/${multiCase.case_id}/files`, { token: owner.token, body: uploadBody(pageB, 'page-b.pdf') });
  const multiEval = (await t.request('POST', `/api/cases/${multiCase.case_id}/evaluate`, { token: owner.token })).json;
  await t.request('POST', `/api/cases/${multiCase.case_id}/results/${multiEval.result_id}/clarify`, { token: owner.token, body: { answers: [
    { question_id: 'report-use', answer: 'credit_transaction' },
    { question_id: 'report-use-amount', purpose: 'credit_transaction', answer: 'at_least_150k' }
  ] } });
  const multiView = (await t.request('GET', `/api/cases/${multiCase.case_id}`, { token: owner.token })).json.view;
  const multiStored = multiView.clarifications.find((c) => c.question_id === 'report-use' && !c.superseded);
  check.equal(multiStored.report_file_ids.length, 2, 'the stored statement binds every assembled file (combined-file provenance)');
  check.equal(multiStored.report_identity.reference_date, '2026-06-12', 'the stored statement retains the original reference date');

  /* 12. No legal-advice disclaimer in the finding path or download. */
  const report = journey.assessmentReportBody(viewAfter.result, '2026-10-04T00:00:00.000Z');
  check.ok(!/legal advi[cs]e/i.test(report), 'the downloaded assessment report carries no legal-advice disclaimer');

  /* 13. UI unit test (fabricated DOM + mocked fetch): footer disclaimer placement and the retained report-use
     rendering capability (purpose → conditional amount → save). The report-use question is injected directly to
     exercise the retained rendering/save code path; the service itself no longer surfaces it (see §14). */
  const vm = require('node:vm');
  const fsNode = require('node:fs');
  const pathNode = require('node:path');
  const appSource = fsNode.readFileSync(pathNode.join(__dirname, '..', '..', 'ui', 'app.js'), 'utf8');
  const bandNodes = ['credit_transaction', 'life_insurance_underwriting', 'employment'].map((purp) => ({ dataset: { purpose: purp }, hidden: true }));
  const reportUseNode = { dataset: { kind: 'report_use' }, getAttribute: (a) => (a === 'data-question' ? 'report-use' : null), querySelectorAll: (sel) => (sel === '.amount-band' ? bandNodes : []) };
  const dontknowBtn = { dataset: { dontknow: 'report-use' }, onclick: null };
  const skipBtn = { dataset: { skip: 'report-use' }, onclick: null };
  const uiNodes = new Map();
  const uiElement = (id) => {
    if (!uiNodes.has(id)) {
      const isPanel = id === 'panel';
      uiNodes.set(id, {
        id, innerHTML: '', textContent: '', className: '', value: '', disabled: false, style: {}, dataset: {}, files: [], onclick: null, onchange: null, hidden: true, scrollIntoView() {},
        querySelectorAll: isPanel ? ((sel) => {
          if (sel === '[data-kind="report_use"]') return [reportUseNode];
          if (sel === '[data-dontknow]') return [dontknowBtn];
          if (sel === '[data-skip]') return [skipBtn];
          return [];
        }) : (() => []),
        querySelector: () => null
      });
    }
    return uiNodes.get(id);
  };
  const postedBodies = [];
  const MIN_RESULT = { support: 'ACTUAL_REPORT_EVIDENCE', checks_performed: 1, observations: [], report_consistency_checks: [], qualifications: [], disclaimer: 'This assessment covers the checks listed in this report.', assessment: { plain: '' } };
  const reportUseQuestion = reportUse.question({ bureau: 'Experian', reference_date: '2026-06-12' });
  reportUseQuestion.question_key = 'report-use';
  const uiView = { case: { country: 'US', region: 'US-NY' }, result: MIN_RESULT, result_id: 'r', assessment_access: { complete_assessment: true, complete_assessment_via: 'SUBSCRIPTION', assessment_download: true, dispute_packet: true, purchase_choices: [] }, assessment_summary: { result_id: 'r', created_at: '2026-10-05T00:00:00.000Z', distinct_total: 0, by_confidence: { violation: 0, probable_violation: 0, potential: 0 }, teaser: null, severity_order: ['REMOVE_ENTRY', 'ADD_CONTENT', 'INCONSISTENCY'] }, clarification_questions: [reportUseQuestion], clarifications: [], reviewed: false, download: { response_draft_available: false, reason: '', reason_plain: '' } };
  const uiCtx = { console, setTimeout, clearTimeout, JSON, Object, Array, Map, Set, Promise, Number, String, Date, Error, RegExp, crypto: { randomUUID: () => 'ui-uuid' },
    fetch: async (url, options) => { if ((options && options.method) === 'POST' && /clarify/.test(url)) postedBodies.push(JSON.parse(options.body)); return { ok: true, status: 200, json: async () => ({ ok: true, view: uiView }), text: async () => '{}' }; },
    document: { getElementById: uiElement, createElement: () => uiElement('anon') },
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
    Blob: class Blob {}, FileReader: class FileReader { readAsDataURL() { this.result = 'data:x'; if (this.onload) this.onload(); } } };
  uiCtx.window = uiCtx; uiCtx.globalThis = uiCtx; uiCtx.window.location = { assign: () => {} };
  vm.createContext(uiCtx);
  vm.runInContext(appSource, uiCtx);
  vm.runInContext('state.caseId = "case-ui"; state.view = ' + JSON.stringify(uiView) + ';', uiCtx);
  vm.runInContext('state.step = 0; render();', uiCtx);
  check.equal(uiElement('footer-disclaimer').hidden, false, 'the disclaimer is visible on the main page (step 0)');
  vm.runInContext('state.step = 3; render();', uiCtx);
  check.equal(uiElement('footer-disclaimer').hidden, true, 'the disclaimer is hidden on the assessment/results step');
  /* OWNER correction (Batch 25): the approved disclaimer is visible in the small main-page footer ONLY. Every
     step is rendered and measured, not just the two sampled above. */
  const footerStepCount = vm.runInContext('STEP_KEYS.length', uiCtx);
  const stepsShowingTheDisclaimer = [];
  for (let step = 0; step < footerStepCount; step += 1) {
    vm.runInContext(`state.step = ${step}; render();`, uiCtx);
    if (!uiElement('footer-disclaimer').hidden) stepsShowingTheDisclaimer.push(step);
  }
  check.deepEqual(stepsShowingTheDisclaimer, [0], `the legal-advice disclaimer is shown on the main page only, and hidden on every other step (all ${footerStepCount} steps rendered)`);
  vm.runInContext('state.step = 3; render();', uiCtx);
  const uiHtml = uiNodes.get('panel').innerHTML;
  check.ok(/Experian credit report dated 2026-06-12/.test(uiHtml), 'the wizard renders the report context in the purpose question');
  check.ok(/A credit transaction \(a loan or credit application\)/.test(uiHtml), 'the wizard renders the readable purpose label');
  check.ok(/\$150,000 or more/.test(uiHtml), 'the wizard renders the readable amount band');
  /* Conditional amount visibility: choosing a purpose reveals only its amount select. */
  uiElement('q-report-use').value = 'credit_transaction';
  uiElement('q-report-use').onchange();
  check.equal(bandNodes[0].hidden, false, 'choosing credit_transaction reveals its amount select');
  check.equal(bandNodes[1].hidden, true, 'the life-insurance amount select stays hidden');
  check.equal(bandNodes[2].hidden, true, 'the employment amount select stays hidden');
  /* Clicking Skip hides all amount selects; a later purpose choice clears the stale special state and submits. */
  skipBtn.onclick();
  check.ok(bandNodes.every((b) => b.hidden === true), 'Skip hides every amount select');
  uiElement('q-report-use').value = 'credit_transaction';
  uiElement('q-report-use').onchange();
  uiElement('q-report-use-amount-credit_transaction').value = 'below_50k';
  uiElement('clarify-submit').onclick();
  await new Promise((r) => setTimeout(r, 0));
  const submitted = (postedBodies[0] && postedBodies[0].answers) || [];
  check.ok(submitted.some((a) => a.question_id === 'report-use' && a.answer === 'credit_transaction'), 'the wizard submits the purpose through the real flow');
  check.ok(submitted.some((a) => a.question_id === 'report-use-amount' && a.purpose === 'credit_transaction' && a.answer === 'below_50k'), 'the wizard submits the conditional amount through the real flow');
  vm.runInContext('state.step = 4; render();', uiCtx);
  check.equal(uiElement('footer-disclaimer').hidden, true, 'the disclaimer is hidden on the review/download step');

  /* 14. Integration coverage: the wizard (in a VM) drives the ACTUAL local service over HTTP (no mocked fetch).
       This is integration coverage, not a real-browser test. It verifies the materiality gate end-to-end — the
       service surfaces the report-use question for a qualified probable issue, so the wizard renders it — while
       footer placement is exercised against the real view. */
  const realOwner = await t.account('report-use-real@example.test');
  const realCase = (await t.request('POST', '/api/cases', { token: realOwner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  await t.request('POST', `/api/cases/${realCase.case_id}/files`, { token: realOwner.token, body: uploadBody(bankruptcyPdf(), 'bankruptcy.pdf') });
  await t.request('POST', `/api/cases/${realCase.case_id}/evaluate`, { token: realOwner.token });
  await t.request('POST', `/api/cases/${realCase.case_id}/review`, { token: realOwner.token });
  const realView = (await t.request('GET', `/api/cases/${realCase.case_id}`, { token: realOwner.token })).json.view;
  check.equal(realView.reviewed, true, 'the consumer reviewed the result');
  check.equal((realView.clarification_questions || []).some((c) => c.id === 'report-use'), false,
    'the real service does not surface report-use for a retired public-record rule');

  const realFetch = async (path, options) => {
    const method = (options && options.method) || 'GET';
    const body = options && options.body ? JSON.parse(options.body) : undefined;
    const res = await t.request(method, path, { token: realOwner.token, body });
    return { ok: res.status >= 200 && res.status < 400, status: res.status, json: async () => res.json, text: async () => res.text };
  };
  const realNodes = new Map();
  const realEl = (id) => {
    if (!realNodes.has(id)) {
      realNodes.set(id, {
        id, innerHTML: '', textContent: '', className: '', value: '', disabled: false, style: {}, dataset: {}, files: [], onclick: null, onchange: null, hidden: true, scrollIntoView() {},
        querySelectorAll: () => [], querySelector: () => null
      });
    }
    return realNodes.get(id);
  };
  const realCtx = { console, setTimeout, clearTimeout, JSON, Object, Array, Map, Set, Promise, Number, String, Date, Error, RegExp, crypto: { randomUUID: () => 'ui-uuid' }, fetch: realFetch,
    document: { getElementById: realEl, createElement: () => realEl('anon') },
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
    Blob: class Blob {}, FileReader: class FileReader { readAsDataURL() { this.result = 'data:x'; if (this.onload) this.onload(); } } };
  realCtx.window = realCtx; realCtx.globalThis = realCtx; realCtx.window.location = { assign: () => {} };
  vm.createContext(realCtx);
  vm.runInContext(appSource, realCtx);
  vm.runInContext('state.caseId = ' + JSON.stringify(realCase.case_id) + '; state.view = ' + JSON.stringify(realView) + '; state.step = 3; render();', realCtx);
  check.equal(realEl('footer-disclaimer').hidden, true, 'the wizard hides the footer disclaimer on the results step (real view)');
  check.ok(!/data-question="report-use"/.test(realNodes.get('panel').innerHTML),
    'the wizard does not render a report-use question that the service did not surface');

  evidence.combination = 'multiple-use flags, conflicting amounts and mismatched-purpose amounts fail closed';
  evidence.negation_only = 'a single-purpose statement resolves only the purpose it names and never unlocks a violation';
  evidence.materiality = 'the report-use question is not surfaced: a single-purpose answer cannot change the finding, and a stored statement is retained without reassessment';
  evidence.context = 'the question names the report (bureau + reference date) and the statement binds report identity, file ids and event server-side';
  evidence.storage = 'the stored statement binds the originally assessed files, retains the reference date, ignores later uploads, and corrections supersede without dropping provenance';
  evidence.footer = 'the legal-advice disclaimer is shown only on the main page and hidden on assessment/review steps';
  return evidence;
}

module.exports = { run, id: 'bg-report-use', title: 'OWNER-REPORT-USE-POLICY-001: report-use clarification is fail-closed and negation-only' };
