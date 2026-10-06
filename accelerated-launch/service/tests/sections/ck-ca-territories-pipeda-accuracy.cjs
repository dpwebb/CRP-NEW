'use strict';
/**
 * ck-ca-territories-pipeda-accuracy.cjs — BATCH-17: the three territorial PIPEDA accuracy outcomes.
 *
 * APPLICABILITY (official material, not inferred): the Office of the Privacy Commissioner of Canada states
 * "Organizations in the Northwest Territories, Yukon, and Nunavut are considered federally regulated, and are
 * therefore also covered by PIPEDA", on the page that records PIPEDA applying to private-sector organizations
 * in the course of a commercial activity, Accuracy as one of the ten Schedule 1 principles, and personal
 * information including credit records and loan records. The duty relied on is Schedule 1 clause 4.6. No
 * retention period and no "shall not report X" prohibition is relied on: a missing retention rule is not a
 * missing compliance duty.
 *
 * WHAT IT MEASURES: the report's OWN two printed values for one ordinary account. When the printed opened date
 * is later than the printed closed date, those values cannot both be accurate. The finding is PROBABLE only —
 * the report does not establish which value is wrong or whether a benign explanation applies — and reaches the
 * consumer as ONE card carrying both supported bases (the factual conflict and the recorded rule) with a single
 * verification request. EVIDENCE KIND: the general intake parser on a synthetic structural model, carried into
 * the store and then through the REAL packet path — structural-model service integration, not PDF upload.
 */
const crypto = require('node:crypto');
const generalIntake = require('../../general-intake.cjs');
const evaluation = require('../../evaluation.cjs');
const { SUPPORT } = require('../../formats.cjs');

const TERRS = [['CA-NT', 'Northwest Territories'], ['CA-NU', 'Nunavut'], ['CA-YT', 'Yukon']];
const REFERENCE_DATE = '2026-06-12';
const DETAILS = { consumer_name: 'Northern Fictional Consumer', contact: 'north.consumer@example.test' };
const CONFLICT = 'Fictional Creditor  Balance $100  Opened 01/01/2020  Closed 01/01/2019';
const BENIGN = 'Fictional Creditor  Balance $100  Opened 01/01/2019  Closed 01/01/2020';
const ONE_DATE = 'Fictional Creditor  Balance $100  Opened 01/01/2020';
const line = (t) => ({ text: t, trusted: true, page: 1, line: 1 });

function extractionFor(...accountLines) {
  return {
    presentation_id: 'GENERAL-BUREAU-REPORT', family_id: null,
    records: generalIntake.buildRecords([{ lines: [line('Equifax  Consumer Credit Report'), line('Report Date: June 12, 2026')].concat(accountLines.map(line)) }], null),
    reference_date: { normalized_value: REFERENCE_DATE },
    support: SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT
  };
}
function evaluateFor(extraction, region) {
  return evaluation.evaluateCase({ country: 'CA', region, presentation: 'GENERAL-BUREAU-REPORT', extraction });
}
function ruleId(region) { return region + '-PIPEDA-SCH1-4-6-ACCURACY'; }
function ruleResults(out, region) { return (out.results || []).filter((r) => r.check && r.check.adapter_id === ruleId(region)); }
function ruleFindings(out, region) { return ruleResults(out, region).map((r) => r.machine && r.machine.finding).filter(Boolean); }
function inject(service, actor, caseId, out, extraction) {
  service.service.store.update((state) => {
    state.results.push({
      result_id: `res_terr_${crypto.randomBytes(10).toString('hex')}`,
      case_id: caseId, account_id: actor.account_id, file_id: null, file_ids: [],
      evaluation: { results: out.results, common_errors: out.common_errors },
      extraction: { records: extraction.records, presentation_id: 'GENERAL-BUREAU-REPORT', reference_date: { normalized_value: REFERENCE_DATE }, support: SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT },
      clarification_eligibility: [], reviewed_at: null, created_at: new Date().toISOString()
    });
  });
}
async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'monthly' } });
  const c = checkout.json.checkout;
  await service.postEvent({
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed', account_reference: actor.account_id, plan_code: c.plan.plan_code,
    session_reference: c.provider_reference, amount_cents: c.plan.amount_cents, currency: c.plan.currency,
    occurred_at: new Date().toISOString()
  });
}
const issues = require('../../issues.cjs');

async function run(service, check) {
  const evidence = {};

  /* ---- 1. Each territory: one PROBABLE accuracy issue, one card, both supported bases. ---- */
  for (const [region, name] of TERRS) {
    const out = evaluateFor(extractionFor(CONFLICT), region);
    const findings = ruleFindings(out, region);
    check.equal(ruleResults(out, region).length, 1, 'the PIPEDA accuracy rule runs in the ' + name);
    check.equal(findings.length, 1, 'and a printed date conflict is a supported accuracy issue there');
    check.equal(findings[0].classification, 'PROBABLE_VIOLATION', 'as PROBABLE, never a definite breach');
    check.match(String(findings[0].citation), /clause 4\.6/, 'citing Schedule 1 clause 4.6');
    check.match(String(findings[0].citation), /federally regulated/, 'with the official application basis recorded in the citation');
    const cards = issues.issuesFor({ evaluation: { results: out.results, common_errors: out.common_errors }, extraction: extractionFor(CONFLICT) });
    check.equal(cards.length, 1, 'exactly one card is offered for this one printed conflict in the ' + name);
    check.equal(cards[0].eligible, true, 'and it is selectable');
    check.equal(cards[0].classification, 'PROBABLE_VIOLATION', 'at the probable classification');
    check.equal(cards[0].confidence, 'PROBABLE', 'carrying the probable confidence');
    check.equal(cards[0].basis_type, 'CONTENT_FINDING', 'on a report-content basis');
    const bases = cards[0].supported_bases || [];
    check.equal(bases.length, 2, 'the card carries both supported bases');
    check.ok(bases.some((b) => b.basis_type === 'FACTUAL_CONSISTENCY'), 'one being the factual conflict the report prints');
    check.ok(bases.some((b) => b.basis_type === 'CONTENT_FINDING' && /clause 4\.6/.test(String(b.citation))), 'the other being the recorded accuracy principle');
  }

  /* ---- 2. Controls: nothing unsupported, and no other jurisdiction is touched. ---- */
  check.equal(ruleResults(evaluateFor(extractionFor(BENIGN), 'CA-NT'), 'CA-NT').length, 1, 'a benign account is still evaluated');
  check.equal(ruleFindings(evaluateFor(extractionFor(BENIGN), 'CA-NT'), 'CA-NT').length, 0, 'but consistent printed dates raise no accuracy issue');
  check.equal(ruleFindings(evaluateFor(extractionFor(ONE_DATE), 'CA-NT'), 'CA-NT').length, 0, 'a record missing one of the two decisive printed values raises no issue');
  check.equal(ruleResults(evaluateFor(extractionFor(CONFLICT), 'CA-BC'), 'CA-BC').length, 0, 'British Columbia gets no territorial rule');
  check.equal(ruleResults(evaluateFor(extractionFor(CONFLICT), 'CA-ON'), 'CA-NT').length, 0, 'and the territorial rule is not offered outside its region');

  /* ---- 3. The consumer journey, on the Northwest Territories. ---- */
  const findIssue = (view, region) => (view.eligible_issues || []).find((i) => String(i.citation || '').indexOf(region) >= 0 || /clause 4\.6/.test(String(i.citation || ''))) || null;
  const owner = await service.unpaidAccount('ck-terr@example.test');
  const stranger = await service.unpaidAccount('ck-terr-stranger@example.test');
  const unpaid = await service.unpaidAccount('ck-terr-unpaid@example.test');
  const unpaidCase = (await service.request('POST', '/api/cases', { token: unpaid.token, body: { country: 'CA', region: 'CA-NT' } })).json.case;
  const refused = await service.request('POST', `/api/cases/${unpaidCase.case_id}/packet/correspondence`, { token: unpaid.token, body: { correspondence: DETAILS } });
  check.equal(refused.status, 402, 'an unpaid account cannot reach the packet path');
  check.equal(refused.json.error.code, 'SUBSCRIPTION_REQUIRED', 'with the subscription refusal');

  const c = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NT' } })).json.case;
  await payReportOnce(service, owner, c.case_id);
  const positive = extractionFor(CONFLICT);
  inject(service, owner, c.case_id, evaluateFor(positive, 'CA-NT'), positive);
  const view = async () => (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view;
  const issue = findIssue(await view(), 'CA-NT');
  check.ok(issue, 'the territorial accuracy issue is offered for selection in the packet');
  check.equal(issue.eligible, true, 'and it is selectable');
  check.equal(issue.confidence, 'PROBABLE', 'at the probable confidence');
  check.match(String(issue.explanation), /cannot both be right/, 'its explanation states what the report prints');
  check.match(String(issue.uncertainty), /Which of the two printed values is unreliable is not established/, 'and names the specific uncertainty');
  check.match(String(issue.uncertainty), /not an established violation/, 'never asserting an established violation');
  check.match(String(issue.uncertainty), /clause 4\.6/, 'stating the recorded principle own words');

  check.equal((await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: stranger.token, body: { issue_ids: [issue.issue_id] } })).status, 403, 'another account cannot select on this packet');
  check.equal((await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: stranger.token })).status, 403, 'nor download it');
  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [issue.issue_id] } });
  check.equal((await view()).packet.selected_count, 1, 'the consumer selects it');
  await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: DETAILS } });
  check.match(JSON.stringify(await view()), /Northern Fictional Consumer/, 'the reviewed correspondence carries the consumer-supplied details');
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: owner.token })).status, 200, 'the packet approves');
  const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'and the entitled download succeeds');
  check.match(dl.text, /clause 4\.6/, 'naming the recorded principle behind the issue');
  check.match(dl.text, /cannot both be right/, 'carrying the printed conflict the verification asks about');
  const changed = extractionFor(BENIGN);
  inject(service, owner, c.case_id, evaluateFor(changed, 'CA-NT'), changed);
  const stale = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.notEqual(stale.status, 200, 'a packet whose evidence changed after approval is not silently downloaded');
  check.match(JSON.stringify(stale.json || {}), /STALE/, 'and the refusal names the stale approval');

  evidence.binding = { duty: 'PIPEDA Schedule 1 clause 4.6 (Accuracy)', ledger_row: 'CRP-LSRC-0313', application: 'OPC: organizations in the Northwest Territories, Yukon and Nunavut are considered federally regulated and are therefore covered by PIPEDA', regions: TERRS.map((t) => t[0]), ceiling: 'PROBABLE_VIOLATION', retention_rule_required: false };
  evidence.evidence_kind = 'general-intake parser on a synthetic structural model through the real packet path: structural-model service integration, not PDF-upload delivery';
  evidence.journey = { case_id: c.case_id, region: 'CA-NT', confidence: 'PROBABLE', approved: true, downloaded_chars: (dl.text || '').length };
  return evidence;
}

module.exports = {
  run,
  id: 'ck-ca-territories-pipeda-accuracy',
  title: 'BATCH-17: territorial PIPEDA Schedule 1 clause 4.6 accuracy outcomes through the complete packet path'
};


