'use strict';
/**
 * cf-ca-nl-dismissed-charge.cjs — BATCH-6: Newfoundland and Labrador s.39(1)(g).
 *
 * The provision was retrieved verbatim from the official consolidator (Part VI, Credit Reports, of the Consumer
 * Protection and Business Practices Act, S.N.L. 2009, c. C-31.1) and the retrieval is recorded on the EXISTING
 * owner-accepted ledger row CRP-LSRC-0344 rather than in a new row. The rule is a period-less CONTENT_INCLUSION
 * prohibition, so it reuses the dismissed-charge mechanism already accepted for Nova Scotia instead of inventing
 * a second one, and it is bound to the general bureau-report intake the same way.
 *
 * This section proves: the rule is wired to the retrieved provision; the positive case reaches the consumer as
 * ONE supported issue and completes upload -> selection -> reviewed correspondence -> approval -> entitled
 * download; the benign, association and out-of-region controls all suppress it; and the existing GB and NS
 * outcomes are unchanged by this addition. Fictional reports only.
 */
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const generalIntake = require('../../general-intake.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const ADAPTER = 'CA-NL-CPBPA-S39-1-G-DISMISSED-CHARGE';
const CITATION = 'Consumer Protection and Business Practices Act (Newfoundland and Labrador), S.N.L. 2009, c. C-31.1, s. 39(1)(g)';
const DETAILS = Object.freeze({ consumer_name: 'Nora Lundrigan', contact: 'nora.lundrigan@example.test' });
const adapter = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === ADAPTER);

const uploadBody = (bytes, filename) => ({
  originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64')
});

function line(text, lineNo) { return { text, trusted: true, page: 1, line: lineNo || 1 }; }
function extract(lines) {
  return generalIntake.buildRecords([{ lines }], null).find((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
}
function runCharge(facts, sources, region) {
  return ruleAdapters.runAdapter(ADAPTER, {
    country: 'CA', region: region || 'CA-NL', presentation: 'GENERAL-BUREAU-REPORT',
    facts, fact_sources: sources || null
  });
}
function matchingSources(facts, recordIndex) {
  const out = {};
  for (const k of Object.keys(facts)) out[k] = { normalized_value: facts[k], location: { page: 1, line: 1 }, record_index: recordIndex === undefined ? 0 : recordIndex };
  return out;
}
function positiveFacts() {
  return {
    'criminalCharge.recordIdentified': true, 'criminalCharge.chargeState': 'PRESENT',
    'criminalCharge.dismissedDispositionState': 'PRESENT', 'criminalCharge.entryComplete': true
  };
}
async function assess(service, actor, region, lines) {
  const pdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026'].concat(lines) }] });
  const created = await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'CA', region } });
  const caseId = created.json.case.case_id;
  const uploaded = await service.request('POST', `/api/cases/${caseId}/files`, { token: actor.token, body: uploadBody(pdf, 'fictional-nl-report.pdf') });
  const evaluated = await service.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token });
  return { caseId, uploaded, evaluated };
}
function nlIssue(view) {
  return (view.eligible_issues || []).find((i) => /39\(1\)\(g\)/.test(String(i.citation || ''))
    || /39\(1\)\(g\)/.test(JSON.stringify(i.supported_bases || []))) || null;
}

const ROOT = require('node:path').resolve(__dirname, '..', '..', '..', '..');

async function run(service, check) {
  const evidence = {};

  /* ---- 1. Wiring: bound to the retrieved provision and to the EXISTING ledger row. ---- */
  check.ok(adapter, 'the Newfoundland rule is registered in the runtime adapter configuration');
  check.equal(adapter.citation, CITATION, 'citing the retrieved provision');
  check.equal(adapter.source_entry_id, 'CRP-LSRC-0344', 'and the existing owner-accepted source row, not a new one');
  check.deepEqual(adapter.ledger_row_ids, ['CRP-LSRC-0344'], 'bound to that one recorded row');
  check.match(adapter.limb, /dismissed or not proceeded with/, 'recording the provision own words rather than a gloss');
  check.equal(adapter.anchor_mode, 'CONTENT_INCLUSION', 'reusing the accepted dismissed-charge mechanism rather than a second one');
  check.equal(adapter.period_years, 0, 'as a period-less content prohibition, not a retention comparison');
  check.equal(adapter.applicability.mode, 'EXACT', 'reaching only its own exact region');
  check.equal(adapter.applicability.region, 'CA-NL', 'Newfoundland and Labrador');
  check.equal(adapter.output_permission.max_conclusion, 'violation', 'with a violation ceiling');
  check.equal(adapter.output_permission.packet_eligible, true, 'and the packet permission the accepted mechanism carries');
  check.equal(adapter.presentation_required, 'GENERAL-BUREAU-REPORT', 'running on the admitted general bureau-report intake');

  const ledger = JSON.parse(require('node:fs').readFileSync(
    require('node:path').join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001O', 'source_id_coverage_ledger.json'), 'utf8'));
  const row = ledger.rows.find((r) => r.source_entry_id === 'CRP-LSRC-0344');
  check.ok(row, 'the recorded source row exists');
  check.equal(row.legacy_statute_or_provision.provision_or_citation, 's. 39(1)(g)', 'carrying the retrieved provision rather than NOT RECORDED');
  check.equal(row.legacy_statute_or_provision.provision_or_citation_history[0].value, 'NOT RECORDED',
    'with the pre-retrieval state preserved rather than overwritten');
  check.match(row.legacy_statute_or_provision.provision_retrieval_record.retrieved_text, /dismissed or not proceeded with/,
    'and the retrieved wording recorded with its locator');
  check.equal(ledger.rows.length, 437, 'and no new ledger row created for it');
  check.equal((ruleAdapters.adaptersForRegion('CA-NL') || []).filter((a) => a.adapter_id === ADAPTER).length, 1,
    'the recorded rule is offered to a CA-NL selection');
  check.equal((ruleAdapters.adaptersForRegion('CA-NS') || []).filter((a) => a.adapter_id === ADAPTER).length, 0,
    'and is not offered outside Newfoundland and Labrador');

  /* ---- 2. Positive and negatives through the real classifier. ---- */
  const facts = positiveFacts();
  const dismissed = runCharge(facts, matchingSources(facts));
  check.equal(dismissed.state, 'EVALUATED', 'the rule evaluates on a criminal-charge record');
  check.equal(dismissed.content.breach, true, 'a printed charge with a dismissed disposition is an inclusion');
  check.equal(dismissed.finding && dismissed.finding.classification, 'VIOLATION', 'matching evidence produces a VIOLATION through the real classifier');
  const seam = () => ruleAdapters.classifyContentInclusion(dismissed, adapter, 'violation');
  check.equal(seam() && seam().classification, 'VIOLATION', 'and the classifier seam returns the same classification');
  check.equal(ruleAdapters.classifyContentInclusion(runCharge(facts, {}), adapter, 'violation'), null, 'missing sources suppress the finding');
  const mismatched = matchingSources(facts);
  mismatched['criminalCharge.dismissedDispositionState'].normalized_value = 'VERIFIED_ABSENT';
  check.equal(ruleAdapters.classifyContentInclusion(runCharge(facts, mismatched), adapter, 'violation'), null, 'a mismatched source value suppresses the finding');
  const crossRecord = matchingSources(facts);
  crossRecord['criminalCharge.dismissedDispositionState'].record_index = 1;
  check.equal(ruleAdapters.classifyContentInclusion(runCharge(facts, crossRecord), adapter, 'violation'), null,
    'a disposition read from a different record than the charge suppresses the finding');
  const convictedOnly = positiveFacts();
  convictedOnly['criminalCharge.dismissedDispositionState'] = 'VERIFIED_ABSENT';
  check.equal(ruleAdapters.classifyContentInclusion(runCharge(convictedOnly, matchingSources(convictedOnly)), adapter, 'violation'), null,
    'a charge that was convicted rather than dismissed is not an inclusion');

  /* ---- 3. The complete consumer path: upload -> issue -> selection -> correspondence -> approval -> download. ---- */
  const owner = await service.unpaidAccount('cf-nl@example.test');
  const stranger = await service.unpaidAccount('cf-nl-stranger@example.test');
  const unpaid = await service.unpaidAccount('cf-nl-unpaid@example.test');
  const unpaidCase = (await service.request('POST', '/api/cases', { token: unpaid.token, body: { country: 'CA', region: 'CA-NL' } })).json.case;
  const refused = await service.request('POST', `/api/cases/${unpaidCase.case_id}/packet/correspondence`, { token: unpaid.token, body: { correspondence: DETAILS } });
  check.equal(refused.status, 402, 'an unpaid account cannot reach the packet path');
  check.equal(refused.json.error.code, 'SUBSCRIPTION_REQUIRED', 'with the subscription refusal');

  const subscription = await service.pay(owner, 'monthly');
  check.equal(subscription.response.accepted, true, 'the account holds an active subscription, so the paid steps are reachable');

  const paid = await assess(service, owner, 'CA-NL', ['Public Record: CRIM-021', 'Criminal Charge: Theft', 'Disposition: Dismissed']);
  check.equal(paid.uploaded.status, 201, 'a CA-NL report uploads');
  check.equal(paid.evaluated.status, 201, 'and evaluates');
  const view = (await service.request('GET', `/api/cases/${paid.caseId}/packet`, { token: owner.token })).json.view;
  const nl = nlIssue(view);
  check.ok(nl, 'the Wizzard offers the Newfoundland issue for selection');
  check.equal(nl.eligible, true, 'and it is selectable for a packet');
  check.match(JSON.stringify(nl), /39\(1\)\(g\)/, 'naming the retrieved provision');
  check.equal(JSON.stringify(nl.supported_bases || []).includes(ADAPTER), false, 'with no internal adapter id leaked into the consumer-facing bases');

  check.equal((await service.request('POST', `/api/cases/${paid.caseId}/packet/select`, { token: stranger.token, body: { issue_ids: [nl.issue_id] } })).status, 403,
    'another account cannot select on this packet');
  check.equal((await service.request('GET', `/api/cases/${paid.caseId}/packet-download`, { token: stranger.token })).status, 403, 'nor download it');
  await service.request('POST', `/api/cases/${paid.caseId}/packet/select`, { token: owner.token, body: { issue_ids: [nl.issue_id] } });
  check.equal((await service.request('GET', `/api/cases/${paid.caseId}/packet`, { token: owner.token })).json.view.packet.selected_count, 1,
    'the consumer selects the issue');
  await service.request('POST', `/api/cases/${paid.caseId}/packet/correspondence`, { token: owner.token, body: { correspondence: DETAILS } });
  check.equal((await service.request('POST', `/api/cases/${paid.caseId}/packet/approve`, { token: owner.token })).status, 200, 'the packet approves');
  const dl = await service.request('GET', `/api/cases/${paid.caseId}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'and the entitled download succeeds');
  check.ok(dl.text.includes('Nora Lundrigan'), 'carrying the consumer-supplied correspondence details');
  check.match(dl.text, /Recorded rule: .*39\(1\)\(g\)/, 'naming the recorded rule behind the finding');

  /* ---- 4. Controls: benign, association, and out-of-region. ---- */
  const noCharge = await assess(service, owner, 'CA-NL', ['Fictional Creditor  Balance $100  Opened 01/01/2020']);
  const noChargeView = (await service.request('GET', `/api/cases/${noCharge.caseId}/packet`, { token: owner.token })).json.view;
  check.equal(nlIssue(noChargeView), null, 'a report printing no criminal charge raises no Newfoundland issue');
  const noChargeReport = (await service.request('GET', `/api/cases/${noCharge.caseId}`, { token: owner.token })).json.view;
  check.equal(JSON.stringify(noChargeReport).includes('compliant'), false, 'and nothing claims that record is compliant');

  const paired = extract([line('Public Record: CRIM-022'), line('Criminal Record'), line('Charge 1: Theft'), line('Disposition 1: Dismissed')]);
  check.equal(paired.facts['criminalCharge.dismissedDispositionState'], 'PRESENT', 'a numbered dismissed disposition binds to its charge');
  const equalNoNumbers = extract([line('Public Record: CRIM-023'), line('Criminal Record'), line('Charge: Theft'), line('Disposition: Dismissed'), line('Charge: Fraud'), line('Disposition: Convicted')]);
  check.equal(equalNoNumbers.facts['criminalCharge.dismissedDispositionState'], 'UNRESOLVED', 'equal charge/disposition counts without identifiers do not pair');
  const judgment = extract([line('Public Record: JDG-001'), line('Judgment'), line('Creditor: ABC'), line('Amount: $4000')]);
  check.equal(judgment.facts['criminalCharge.recordIdentified'], undefined, 'a judgment is not a criminal charge');

  const outside = await assess(service, owner, 'CA-NS', ['Public Record: CRIM-024', 'Criminal Charge: Theft', 'Disposition: Dismissed']);
  const outsideView = (await service.request('GET', `/api/cases/${outside.caseId}/packet`, { token: owner.token })).json.view;
  check.equal(nlIssue(outsideView), null, 'the same printed charge outside Newfoundland and Labrador raises no Newfoundland issue');
  check.ok((outsideView.eligible_issues || []).some((i) => /10\(3\)\(f\)/.test(String(i.citation || ''))),
    'while Nova Scotia still reaches its own recorded rule');

  /* ---- 5. The existing GB and NS outcomes are unchanged by this addition. ---- */
  const nsId = 'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE';
  check.equal((ruleAdapters.adaptersForRegion('CA-NS') || []).filter((a) => a.adapter_id === nsId).length, 1,
    'the accepted Nova Scotia dismissed-charge rule is still offered to CA-NS');
  const gbId = 'GB-UK-GDPR-ART5-1-D-ART16-ACCURACY';
  const gb = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === gbId);
  check.ok(gb && gb.output_permission.packet_eligible === false, 'the GB accuracy rule keeps its own narrower packet permission');
  for (const region of ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS']) {
    check.equal((ruleAdapters.adaptersForRegion(region) || []).filter((a) => a.adapter_id === gbId).length, 1,
      `${region}: the GB accuracy rule is still offered through its recorded relation`);
  }

  evidence.journey = { case_id: paid.caseId, issue_eligible: nl.eligible, selected: 1, approved: true, downloaded_chars: (dl.text || '').length };
  evidence.controls = [
    'a report printing no criminal charge raises nothing and claims no compliance',
    'a numbered dismissed disposition binds to its charge; equal counts without identifiers do not pair',
    'a judgment record is not treated as a criminal charge',
    'the same printed charge outside Newfoundland and Labrador raises no Newfoundland issue',
    'missing, mismatched and cross-record source evidence each suppress the finding',
    'the existing Nova Scotia and GB outcomes are unchanged'
  ];
  evidence.wiring = { source_entry_id: 'CRP-LSRC-0344', citation: CITATION, mechanism: 'CONTENT_INCLUSION (reused)', ceiling: 'violation' };
  return evidence;
}

module.exports = {
  run,
  id: 'cf-ca-nl-dismissed-charge',
  title: 'BATCH-6: Newfoundland and Labrador s.39(1)(g) dismissed-charge prohibition (retrieved provision, complete consumer path)'
};
