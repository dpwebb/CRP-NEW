'use strict';
/**
 * cc-ca-on-ordinary-report.cjs — OWNER-CA-ORDINARY-REPORT-001: the strongest supported Canadian ordinary-report
 * compliance issue, implemented on ALREADY-EXTRACTED facts and delivered through the complete consumer path.
 *
 * The candidate: Ontario's Consumer Reporting Act, R.S.O. 1990, c. C.33, s. 9(3)(a), recorded in the admitted
 * corpus as the legacy atomic rule `ca-on.cra.s9_3_a.best_evidence_basis` in the ratified family
 * REPORT_ACCURACY_OR_COMPLETENESS (source entry CRP-LSRC-0362). Of the recorded Canadian candidates it is the
 * only one whose applicability is EXACT to a region, whose instrument class is confirmed as a statute or
 * regulation, and whose legacy operational mapping is established; the country-wide candidates (PIPEDA) still
 * require a region relation, and the remaining Ontario IDs carry a SCREEN_INCONCLUSIVE instrument class.
 *
 * What the rule measures: the report's OWN two printed values for ONE ordinary account. When the printed opened
 * date is later than the printed closed date, those values cannot both be right. That is affirmative report
 * evidence of a probable breach of the recorded provision — and it is never a definite breach, because the report
 * does not show which of the two values is unreliable or whether a benign explanation applies. The ceiling is
 * therefore PROBABLE_VIOLATION and the request is a VERIFICATION, never a correction demand.
 *
 * The provision's own words are recorded (see the provision-retrieval record), not the legacy rule name and not an
 * earlier gloss: a consumer reporting agency shall not include in a consumer report any credit information based
 * on evidence that is not the best evidence reasonably available.
 *
 * A reading that could not be made is never treated as an absent date, an absent date is never treated as
 * compliance, and nothing is inferred from an uncatalogued presentation. The same printed conflict reaches the
 * consumer ONCE: the shared factual observation is folded into the issue as a second supported base. Fictional
 * reports only.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const issues = require('../../issues.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const ADAPTER_ID = 'CA-ON-CRA-S9-3-A-RELIABLE-EVIDENCE-BASIS';
const LEGACY_RULE_ID = 'ca-on.cra.s9_3_a.best_evidence_basis';
const CITATION = 'Consumer Reporting Act (Ontario), R.S.O. 1990, c. C.33, s. 9(3)(a)';
const LEDGER = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001O', 'source_id_coverage_ledger.json');
const RESCREEN = path.join(ROOT, 'SOURCE_CAPTURES', 'CA-ON-ORDINARY-REPORT', 'crp-lsrc-0362-report-evidence-reliability-rescreen-disposition.json');
const RETRIEVAL = path.join(ROOT, 'SOURCE_CAPTURES', 'CA-ON-ORDINARY-REPORT', 'crp-lsrc-0362-provision-retrieval.json');
const DETAILS = Object.freeze({ consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' });

const uploadBody = (bytes, filename) => ({
  originalFilename: filename,
  declaredBytes: bytes.length,
  mimeType: 'application/pdf',
  contentBase64: bytes.toString('base64')
});

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'report_once', case_id: caseId } });
  const c = checkout.json.checkout;
  const posted = await service.postEvent({
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed', account_reference: actor.account_id, plan_code: c.plan.plan_code,
    session_reference: c.provider_reference, amount_cents: c.plan.amount_cents, currency: c.plan.currency,
    occurred_at: new Date().toISOString()
  });
  if (posted.status !== 200 || posted.json.event.accepted !== true) throw new Error(`entitlement failed ${posted.status}`);
}

/** One fictional general bureau report for one selection, assessed through the real service. */
async function assess(service, actor, country, region, lines) {
  const pdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', ...lines] }] });
  const c = (await service.request('POST', '/api/cases', { token: actor.token, body: { country, region } })).json.case;
  const up = await service.request('POST', `/api/cases/${c.case_id}/files`, { token: actor.token, body: uploadBody(pdf, 'fictional-ordinary-report.pdf') });
  const ev = await service.request('POST', `/api/cases/${c.case_id}/evaluate`, { token: actor.token });
  return { caseId: c.case_id, presentation: up.json.receipt.format_detection.presentation_id, evaluation_status: ev.status };
}

const ontarioIssue = (view) => (view.eligible_issues || []).find((i) => i.citation === CITATION) || null;

async function run(service, check) {
  const evidence = {};

  /* ---- 1. The candidate, and the one outstanding item the ledger names for it, recorded precisely. ---- */
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const row = (ledger.rows || []).find((r) => r.source_entry_id === 'CRP-LSRC-0362');
  check.ok(row, 'the admitted ledger carries the Ontario candidate CRP-LSRC-0362');
  check.equal(row.record_type, 'CONTENT_RULE', 'as a report-content rule');
  check.equal(row.source_family_label, 'REPORT_ACCURACY_OR_COMPLETENESS', 'in the report-accuracy family');
  check.equal(row.established_jurisdiction_associations.canonical_jurisdiction_status, 'EXACT', 'with an EXACT regional association, not a country-wide one');
  check.equal(row.established_jurisdiction_associations.canonical_region_code, 'CA-ON', 'naming Ontario in its own right');
  check.equal(row.owner_acceptance.state, 'OWNER_ACCEPTED_LEGAL_AUTHORITY', 'owner-accepted');
  check.equal(row.owner_acceptance.instrument_class_screen, 'STATUTE_OR_REGULATION', 'screened as a statute or regulation');
  check.equal(row.owner_acceptance.instrument_class_confirmation_required, false, 'with no outstanding instrument-class confirmation');
  check.equal(row.existing_operational_mapping.state, 'ESTABLISHED', 'with an established operational mapping');
  check.equal(row.existing_operational_mapping.legacy_rule_references[0].ruleId, LEGACY_RULE_ID, 'bound to the recorded legacy atomic rule');
  check.deepEqual(row.remaining_implementation_dependencies, ['REGISTER_DISPOSITION_UNRESOLVED'], 'whose only outstanding implementation dependency is the durable rescreen record');
  check.equal(row.register_state.blocker_type, 'NO_DURABLE_RESCREEN_RECORD', 'named exactly as the ledger names it');
  check.match(row.register_state.clearing_authority, /WORK - record a durable per-ID rescreen disposition/, 'with the ledger own clearing authority recorded');

  const rescreen = JSON.parse(fs.readFileSync(RESCREEN, 'utf8'));
  check.equal(rescreen.source_entry_id, 'CRP-LSRC-0362', 'the durable per-ID rescreen disposition is recorded rather than assumed away');
  check.equal(rescreen.rescreen_disposition.adapter_id, ADAPTER_ID, 'against the configured rule');
  check.equal(rescreen.rescreen_disposition.maximum_conclusion, 'probable_violation', 'recording the ceiling as a probable violation, never a definite one');
  check.equal(rescreen.rescreen_disposition.packet_eligible, false, 'with no packet permission widened to make it reachable');
  check.equal(rescreen.rescreen_disposition.report_field_mapping_used.status, 'ALREADY_ESTABLISHED_AND_EVIDENCED', 'turning only on field mapping that is already established and evidenced');
  check.equal(rescreen.rescreen_disposition.report_field_mapping_used.additional_authorised_evidence_route_required, false, 'so the ledger additional evidence-route condition is not triggered');
  const retrieval = JSON.parse(fs.readFileSync(RETRIEVAL, 'utf8'));
  check.equal(retrieval.source_entry_id, 'CRP-LSRC-0362', 'the provision the rule is attributed to was retrieved or located, not assumed');
  check.equal(retrieval.instrument.provision, 's. 9(3)(a)', 'for the cited paragraph');
  check.match(retrieval.instrument.publisher, /Government of Ontario/, 'from the province official consolidated source');
  check.match(retrieval.applicable_edition.consolidation_period, /From July 1, 2026/, 'recording the applicable edition period');
  check.equal(retrieval.applicable_edition.last_amendment_shown, '2025, c. 24, Sched. 6', 'and its last amendment');
  check.equal(retrieval.section_9_structure_located.subsections.includes('9(2) Information included in consumer report'), true, 'with the structure of the section recorded, so the paragraph is read in its own subsection');
  check.match(retrieval.located_provision_text.quoted_paragraph_a, /any credit information based on evidence that is not the best evidence reasonably available/, 'and the provision own words recorded, not the legacy rule name');
  check.equal(retrieval.attribution_check.result, 'SUPPORTS_THE_ASSESSMENT', 'with the implemented concern checked against that wording');
  check.match(retrieval.attribution_check.confidence_ceiling_justified, /PROBABLE_VIOLATION/, 'and the probable ceiling justified rather than assumed');
  check.match(retrieval.wording_verification_status.paragraph_a_basis, /full-page render/i, 'with the retrieval limitation recorded rather than concealed');
  check.match(retrieval.corrected_recorded_subject.previous_recording_defect, /most reliable evidence/, 'naming the earlier gloss it corrects');
  check.match(retrieval.temporal_applicability.corrected_earlier_assertion, /condition of LEGAL ATTRIBUTION/, 'and correcting the claim that temporal applicability does not matter');
  check.match(retrieval.temporal_applicability.corrected_earlier_assertion, /different question from retention arithmetic/, 'keeping applicability and retention arithmetic apart');
  check.equal(retrieval.temporal_applicability.status, 'NOT_RECORDED_FOR_THIS_PROVISION', 'while still claiming no commencement date');
  check.equal(rescreen.retained_limitations.provision_wording.startsWith('RECORDED'), true, 'the disposition now records the located provision wording instead of leaving it unstated');
  check.equal(rescreen.retained_limitations.provision_retrieval_record, 'SOURCE_CAPTURES/CA-ON-ORDINARY-REPORT/crp-lsrc-0362-provision-retrieval.json', 'and points at the retrieval record it rests on');
  check.match(rescreen.retained_limitations.commencement, /NOT TREATED AS IRRELEVANT/, 'correcting the assertion that commencement is irrelevant');
  check.ok(rescreen.retained_limitations.administrative_limitations_retained.includes('LOCATOR_OR_EFFECTIVE_INFORMATION_NOT_RECORDED'), 'and retaining every administrative limitation the ledger records');
  check.equal(rescreen.retained_limitations.other_outstanding_items_on_this_id.length, 0, 'with no other item left unstated on this ID');
  check.match(rescreen.retained_limitations.note, /does not reopen legal validity/, 'and stating plainly that it reopens nothing');

  const config = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === ADAPTER_ID);
  check.ok(config, 'the rule is configured in the runtime adapter configuration');
  check.equal(config.citation, CITATION, 'citing the recorded Ontario provision');
  check.equal(config.legacy_rule_id, LEGACY_RULE_ID, 'under its recorded legacy atomic rule id');
  check.equal(config.source_entry_id, 'CRP-LSRC-0362', 'and its recorded source entry');
  check.equal(config.output_permission.max_conclusion, 'probable_violation', 'whose maximum conclusion is a probable violation');
  check.equal(config.output_permission.finding_allowed, true, 'which may emit a finding');
  check.equal(config.output_permission.packet_eligible, false, 'with no packet permission granted');
  check.deepEqual(config.applicability, { mode: 'EXACT', country: 'CA', region: 'CA-ON' }, 'and which runs only under an explicit Ontario selection');
  check.deepEqual(config.presentations_required || config.presentation_required, ['GENERAL-BUREAU-REPORT', 'FAM-TU-CA-CONSUMER'], 'on the general intake and source-linked TransUnion account dates');
  check.match(config.limb, /RECORDED PROVISION/, 'whose recorded basis is the located provision rather than an unrecorded subject');
  check.match(config.limb, /any credit information based on evidence that is not the best evidence reasonably available/, 'carrying the provision own wording');
  check.match(config.limb, /consolidation period from July 1, 2026/, 'with the applicable edition recorded');
  check.match(config.limb, /Government of Ontario, e-Laws/, 'and the source identity recorded');
  check.match(config.limb, /full-page render was unavailable/i, 'while retaining the retrieval limitation rather than concealing it');
  check.match(config.limb, /NOT the same as retention arithmetic/, 'and keeping temporal applicability apart from retention arithmetic');
  check.match(config.exceptions.basis, /located provision states no exception/, 'and stating the exception position against the located provision');

  /* ---- 2. The positive case: upload -> Issue -> Wizzard -> correspondence -> approval -> entitled download. ---- */
  const owner = await service.unpaidAccount('cc-ontario@example.test');
  const stranger = await service.unpaidAccount('cc-ontario-stranger@example.test');
  const unpaid = await service.unpaidAccount('cc-ontario-unpaid@example.test');
  const unpaidCase = (await service.request('POST', '/api/cases', { token: unpaid.token, body: { country: 'CA', region: 'CA-ON' } })).json.case;
  const unpaidWrite = await service.request('POST', `/api/cases/${unpaidCase.case_id}/packet/correspondence`, { token: unpaid.token, body: { correspondence: DETAILS } });
  check.equal(unpaidWrite.status, 402, 'an unpaid account cannot reach the packet path');
  check.equal(unpaidWrite.json.error.code, 'ENTITLEMENT_REQUIRED', 'with the entitlement refusal');

  const subscription = await service.pay(owner, 'monthly');
  check.equal(subscription.response.accepted, true, 'the account holds an active subscription, so the paid steps are reachable');
  const paid = await assess(service, owner, 'CA', 'CA-ON', ['Fictional Creditor  Balance $100  Opened 01/01/2020  Closed 01/01/2019']);
  check.equal(paid.presentation, 'GENERAL-BUREAU-REPORT', 'the report is admitted through the general bureau-report intake');
  const view = (await service.request('GET', `/api/cases/${paid.caseId}/packet`, { token: owner.token })).json.view;
  const ontario = ontarioIssue(view);
  check.ok(ontario, 'the Wizzard offers the Ontario compliance issue for selection');
  check.equal(ontario.confidence, 'PROBABLE', 'as a probable issue, because the report shows the conflict but not which value is unreliable');
  check.equal(ontario.basis_type, 'CONTENT_FINDING', 'on a report-content basis, not a retention comparison');
  check.equal(ontario.request_type, 'VERIFICATION', 'with a factual verification request');
  check.equal(ontario.citation, CITATION, 'and the recorded Ontario provision');
  check.equal(ontario.rule_source_version, '90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF', 'bound to the recorded source version');
  check.equal(ontario.eligible, true, 'and it is selectable for a packet');
  check.match(ontario.explanation, /cannot both be right/, 'its explanation states what the report prints');
  check.match(ontario.uncertainty, /Which of the two printed values is unreliable is not established/, 'and names the specific uncertainty');
  check.match(ontario.uncertainty, /benign explanation/, 'including the benign alternative rather than treating the conflict as proof');
  check.match(ontario.uncertainty, /not an established violation/, 'and never asserting an established violation');
  check.match(ontario.uncertainty, /any credit information based on evidence that is not the best evidence reasonably available/, 'stating the provision own words rather than an unrecorded gloss');
  check.match(ontario.uncertainty, /Consumer Reporting Act \(Ontario\), R\.S\.O\. 1990, c\. C\.33, s\. 9\(3\)\(a\)/, 'with the cited provision named in the consumer wording');
  check.equal((ontario.source_facts || []).length, 2, 'with both printed readings as its decisive facts');
  const openedFact = ontario.source_facts.find((f) => /opened_date/.test(f.source_field));
  const closedFact = ontario.source_facts.find((f) => /closed_date/.test(f.source_field));
  check.ok(openedFact && closedFact, 'one for each of the two printed dates');
  check.equal(openedFact.raw_value, '01/01/2020', 'carrying the raw printed opened value');
  check.equal(openedFact.normalized_value, '2020-01-01', 'and its normalization');
  check.equal(openedFact.location.page, 1, 'and its source page');
  check.equal(closedFact.raw_value, '01/01/2019', 'carrying the raw printed closed value');
  check.equal(closedFact.normalized_value, '2019-01-01', 'and its normalization');
  /* OWNER-CA-ORDINARY-REPORT-002: the same printed conflict must reach the consumer ONCE. The shared factual
     observation is folded into this issue as a supported base instead of being offered as a second card, and both
     bases stay on the issue with their provenance intact. */
  check.equal(view.eligible_issues.length, 1, 'exactly one issue is offered for this one printed conflict');
  check.equal(view.eligible_issues.filter((i) => i.confidence === 'POTENTIAL').length, 0, 'so the shared factual observation is not offered as a second card');
  const bases = ontario.supported_bases || [];
  check.equal(bases.length, 2, 'the issue carries both of its supported bases');
  check.ok(bases.some((b) => b.basis_type === 'FACTUAL_CONSISTENCY' && b.check_kind === 'an account with contradictory dates'),
    'one base being the factual conflict the report prints, in plain language');
  check.ok(bases.some((b) => b.basis_type === 'CONTENT_FINDING' && b.citation === CITATION),
    'the other being the recorded Ontario rule it raises');
  check.equal(JSON.stringify(bases).includes('COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'), false, 'with no internal check id exposed to the consumer');
  check.equal(issues.isEligible({ basis_type: 'CONTENT_FINDING', confidence: 'PROBABLE', packet_eligible: false }), true,
    'a probable content finding is packet-eligible by confidence, with no widened per-rule permission');


  check.equal((await service.request('POST', `/api/cases/${paid.caseId}/packet/select`, { token: stranger.token, body: { issue_ids: [ontario.issue_id] } })).status, 403,
    'another account cannot select on this packet');
  check.equal((await service.request('GET', `/api/cases/${paid.caseId}/packet-download`, { token: stranger.token })).status, 403,
    'nor download it');

  await service.request('POST', `/api/cases/${paid.caseId}/packet/select`, { token: owner.token, body: { issue_ids: [ontario.issue_id] } });
  const selected = (await service.request('GET', `/api/cases/${paid.caseId}/packet`, { token: owner.token })).json.view;
  check.equal(selected.packet.selected_count, 1, 'the consumer selects the one coherent issue for this conflict');
  check.equal(selected.eligible_issues.length, 1, 'with no second card left to select');
  await service.request('POST', `/api/cases/${paid.caseId}/packet/correspondence`, { token: owner.token, body: { correspondence: DETAILS } });
  const approved = await service.request('POST', `/api/cases/${paid.caseId}/packet/approve`, { token: owner.token });
  check.equal(approved.status, 200, 'the packet approves');
  const dl = await service.request('GET', `/api/cases/${paid.caseId}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'and the entitled download succeeds');
  check.ok(dl.text.includes(ontario.explanation), 'the downloaded correspondence carries the reviewed issue');
  check.ok(dl.text.includes(CITATION), 'and the recorded Ontario provision');
  check.ok(dl.text.includes(`Recorded rule: ${CITATION}`), 'as the recorded rule behind the finding');
  check.ok(/Request \(verification\): /.test(dl.text), 'with a verification request, never a correction demand');
  check.ok(dl.text.includes('any credit information based on evidence that is not the best evidence reasonably available'), 'and the provision own words in the reviewed issue');
  check.ok(/Also rests on: what the report prints — an account with contradictory dates/.test(dl.text), 'naming its second supported base in plain language');
  check.equal((dl.text.match(/Request \(verification\): /g) || []).length, 1, 'with exactly one request for the one issue, so the conflict is never demanded twice');
  check.equal(dl.text.includes('please verify the opened and closed dates for this account and correct the inconsistency'), false, 'and the duplicate factual request wording never appears');
  check.ok(/opened_date_printed_on_this_record: printed "01\/01\/2020"/.test(dl.text), 'and the raw printed opened reading in the evidence references');
  check.ok(/closed_date_printed_on_this_record: printed "01\/01\/2019"/.test(dl.text), 'and the raw printed closed reading');
  check.ok(/normalized to 2020-01-01/.test(dl.text), 'with its normalization');
  check.ok(dl.text.includes('Dana Whitfield'), 'carrying the consumer-supplied correspondence details');
  check.ok(!/opened date later than its closed date/.test(dl.text), 'and never the unselected factual card wording as a second issue');
  check.ok(!/is an established reporting issue/i.test(dl.text), 'never asserting an established reporting issue for a probable one');
  check.ok(!/ESTABLISHED REPORTING ISSUE/.test(dl.text), 'and never presenting it as an established issue');
  check.ok(/not an established violation/.test(dl.text), 'while stating plainly that it is not an established violation');


  /* ---- 3. Benign controls: no fire where the report is consistent, elsewhere, or where a reading is missing. ---- */
  const consistent = await assess(service, owner, 'CA', 'CA-ON', ['Fictional Creditor  Balance $100  Opened 01/01/2018  Closed 01/01/2020']);
  const consistentView = (await service.request('GET', `/api/cases/${consistent.caseId}/packet`, { token: owner.token })).json.view;
  check.equal(ontarioIssue(consistentView), null, 'an account whose printed opened date precedes its closed date raises no Ontario issue');

  const elsewhere = await assess(service, owner, 'CA', 'CA-NS', ['Fictional Creditor  Balance $100  Opened 01/01/2020  Closed 01/01/2019']);
  const elsewhereView = (await service.request('GET', `/api/cases/${elsewhere.caseId}/packet`, { token: owner.token })).json.view;
  check.equal(ontarioIssue(elsewhereView), null, 'the same printed conflict outside Ontario raises no Ontario issue');
  check.ok((elsewhereView.eligible_issues || []).some((i) => i.confidence === 'POTENTIAL'), 'while the shared factual observation is still offered there');

  const otherCountry = await assess(service, owner, 'US', 'US-CA', ['Fictional Creditor  Balance $100  Opened 01/01/2020  Closed 01/01/2019']);
  const otherCountryView = (await service.request('GET', `/api/cases/${otherCountry.caseId}/packet`, { token: owner.token })).json.view;
  check.equal(ontarioIssue(otherCountryView), null, 'and a United States selection raises no Ontario issue');

  const oneDate = await assess(service, owner, 'CA', 'CA-ON', ['Fictional Creditor  Balance $100  Opened 01/01/2020']);
  const oneDateView = (await service.request('GET', `/api/cases/${oneDate.caseId}/packet`, { token: owner.token })).json.view;
  check.equal(ontarioIssue(oneDateView), null, 'a record printing only one of the two dates raises no Ontario issue');
  const oneDateReport = (await service.request('GET', `/api/cases/${oneDate.caseId}`, { token: owner.token })).json.view;
  check.equal(JSON.stringify(oneDateReport).includes('compliant'), false, 'and nothing claims that account is compliant or consistent');
  check.equal(JSON.stringify(oneDateReport).includes('no problem'), false, 'nor that no problem exists');

  const unreadable = await assess(service, owner, 'CA', 'CA-ON', ['Fictional Creditor  Balance $100  Opened 02/03/2020  Closed 03/02/2019']);
  const unreadableView = (await service.request('GET', `/api/cases/${unreadable.caseId}/packet`, { token: owner.token })).json.view;
  check.equal(ontarioIssue(unreadableView), null, 'an ambiguous date convention that cannot be resolved raises no Ontario issue');
  const unreadableReport = (await service.request('GET', `/api/cases/${unreadable.caseId}`, { token: owner.token })).json.view;
  check.equal(JSON.stringify(unreadableReport).includes('compliant'), false, 'and a reading that could not be made is never reported as compliance');

  /* The rule is advertised where it applies and nowhere else. */
  check.equal((ruleAdapters.adaptersForRegion('CA-ON') || []).filter((a) => a.adapter_id === ADAPTER_ID && a.confirmed === true).length, 1,
    'the rule is confirmed for an Ontario selection');
  check.equal((ruleAdapters.adaptersForRegion('CA-NS') || []).filter((a) => a.adapter_id === ADAPTER_ID).length, 0,
    'and is not offered for Nova Scotia');
  check.equal((ruleAdapters.adaptersForRegion('US-CA') || []).filter((a) => a.adapter_id === ADAPTER_ID).length, 0,
    'nor for a United States selection');

  evidence.candidate = { source_entry_id: 'CRP-LSRC-0362', citation: CITATION, legacy_rule_id: LEGACY_RULE_ID, jurisdiction: 'CA-ON (EXACT)', ceiling: 'probable_violation', packet_eligible: false };
  evidence.provision = {
    publisher: retrieval.instrument.publisher,
    edition: retrieval.applicable_edition.consolidation_period,
    last_amendment: retrieval.applicable_edition.last_amendment_shown,
    located_paragraph_a: retrieval.located_provision_text.quoted_paragraph_a,
    attribution_result: retrieval.attribution_check.result,
    wording_status: retrieval.wording_verification_status.paragraph_a_wording,
    temporal_applicability: retrieval.temporal_applicability.status
  };
  evidence.positive = {
    case_id: paid.caseId,
    confidence: ontario.confidence,
    request_type: ontario.request_type,
    issues_offered: view.eligible_issues.length,
    supported_bases: bases.map((b) => b.basis_type),
    downloaded_chars: (dl.text || '').length
  };
  evidence.controls = [
    'a consistent account raises nothing',
    'the same printed conflict outside Ontario raises no Ontario issue and still offers the factual observation',
    'a United States selection raises no Ontario issue',
    'one printed date raises nothing and claims no compliance',
    'an ambiguous convention raises nothing and claims no compliance',
    'the same printed conflict inside Ontario offers exactly one issue, with the duplicate factual card suppressed'
  ];
  evidence.retained_items = [
    'the provision wording is now recorded from the located text, and the earlier gloss has been corrected',
    'no authoritative full-page render of paragraph (a) was obtained in this environment, and that limitation is retained',
    'no commencement date is claimed for the provision, and temporal applicability is kept apart from retention arithmetic',
    'the ledger administrative limitations stay retained',
    'CRP-LSRC-0363 to CRP-LSRC-0372 stay SCREEN_INCONCLUSIVE and unimplemented',
    'the country-wide PIPEDA candidates still require a recorded region relation'
  ];
  return evidence;
}

module.exports = {
  run,
  id: 'cc-ca-on-ordinary-report',
  title: 'OWNER-CA-ORDINARY-REPORT-001 / -002: the Ontario ordinary-report reliability issue, on its located provision, through the complete upload -> Issue -> Wizzard -> correspondence -> approval -> entitled download path, as one coherent issue with both supported bases, with positive and benign controls'
};

