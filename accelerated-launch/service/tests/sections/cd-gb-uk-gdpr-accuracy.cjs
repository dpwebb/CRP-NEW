'use strict';
/**
 * cd-gb-uk-gdpr-accuracy.cjs — CRP_VERSION_1_FINISH_ORDER_001: the GB accuracy/rectification issue (UK GDPR,
 * Articles 5(1)(d) and 16; source entry CRP-LSRC-0407; legacy atomic rule uk.accuracy_duty.gdpr5), delivered to a
 * GB selection through the complete consumer path as ONE coherent issue carrying both of its supported bases.
 *
 * Why this outcome is ready where the remaining Canadian rows are not: the recorded row is owner-accepted, its
 * instrument class is a statute with no confirmation outstanding, its legacy operational mapping is ESTABLISHED,
 * and the provision's own words and its "U.K." territorial extent are retrievable from the official publisher. The
 * four canonical GB regions are therefore reached through a recorded relation built on the instrument's own extent
 * rather than by resolving a bare UK token from off-report state.
 *
 * The rule reuses the CONTENT_RELIABILITY anchor mode already implemented for the Ontario limb: the report's OWN
 * two printed values for ONE ordinary account. When the printed opened date is later than the printed closed date,
 * those values cannot both be right. The ceiling is PROBABLE_VIOLATION (the report never shows which value is
 * inaccurate or whether a benign explanation applies) and the request is a VERIFICATION, never a correction demand.
 *
 * The current-format GB consumer-disclosure family artifact gap is NOT addressed here and is not implied by this
 * section: this rule runs on the general bureau-report intake. Fictional reports only.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const issues = require('../../issues.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const ADAPTER_ID = 'GB-UK-GDPR-ART5-1-D-ART16-ACCURACY';
const RELATION_ID = 'GB-UK-GDPR-ACCURACY-COUNTRY-WIDE';
const LEGACY_RULE_ID = 'uk.accuracy_duty.gdpr5';
const SOURCE_VERSION = 'FE5C1BA63AE85923E378D4278C3D6E85461E8DF648847F43FE02FB4185BD41F6';
const CITATION = 'UK GDPR — Regulation (EU) 2016/679 as it forms part of the law of the United Kingdom, Articles 5(1)(d) and 16';
const GB_REGIONS = ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS'];
const LEDGER = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001O', 'source_id_coverage_ledger.json');
const RETRIEVAL = path.join(ROOT, 'SOURCE_CAPTURES', 'GB-UK-GDPR-ACCURACY', 'crp-lsrc-0407-provision-retrieval.json');
const RESCREEN = path.join(ROOT, 'SOURCE_CAPTURES', 'GB-UK-GDPR-ACCURACY', 'crp-lsrc-0407-uk-gdpr-accuracy-rescreen-disposition.json');
const DETAILS = Object.freeze({ consumer_name: 'Rowan Ellis', contact: 'rowan.ellis@example.test' });

const uploadBody = (bytes, filename) => ({
  originalFilename: filename,
  declaredBytes: bytes.length,
  mimeType: 'application/pdf',
  contentBase64: bytes.toString('base64')
});

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'monthly' } });
  const c = checkout.json.checkout;
  const posted = await service.postEvent({
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed', account_reference: actor.account_id, plan_code: c.plan.plan_code,
    session_reference: c.provider_reference, amount_cents: c.plan.amount_cents, currency: c.plan.currency,
    occurred_at: new Date().toISOString()
  });
  if (posted.status !== 200 || posted.json.event.accepted !== true) throw new Error(`entitlement failed ${posted.status}`);
}

/** One fictional general bureau report for one GB selection, assessed through the real service. */
async function assess(service, actor, region, lines) {
  const pdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', ...lines] }] });
  const c = (await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'GB', region } })).json.case;
  const up = await service.request('POST', `/api/cases/${c.case_id}/files`, { token: actor.token, body: uploadBody(pdf, 'fictional-gb-report.pdf') });
  const ev = await service.request('POST', `/api/cases/${c.case_id}/evaluate`, { token: actor.token });
  return { caseId: c.case_id, presentation: up.json.receipt.format_detection.presentation_id, evaluation_status: ev.status };
}

const gbIssue = (view) => (view.eligible_issues || []).find((i) => i.citation === CITATION) || null;

module.exports = { run, id: 'cd-gb-uk-gdpr-accuracy', title: 'CRP_VERSION_1_FINISH_ORDER_001: the GB UK GDPR accuracy/rectification issue through the complete upload -> Issue -> Wizzard -> correspondence -> approval -> entitled download path, with positive and benign controls' };

async function run(service, check) {
  const evidence = {};

  /* ---- 1. The recorded row, the retrieved provision, the durable disposition and the wiring. ---- */
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const row = (ledger.rows || []).find((r) => r.source_entry_id === 'CRP-LSRC-0407');
  check.ok(row, 'the admitted ledger carries the GB accuracy row CRP-LSRC-0407');
  check.equal(row.record_type, 'CONTENT_RULE', 'as a report-content rule');
  check.equal(row.source_family_label, 'REPORT_ACCURACY_OR_COMPLETENESS', 'in the report-accuracy family');
  check.equal(row.owner_acceptance.state, 'OWNER_ACCEPTED_LEGAL_AUTHORITY', 'owner-accepted');
  check.equal(row.owner_acceptance.instrument_class_screen, 'STATUTE_OR_REGULATION', 'screened as a statute or regulation');
  check.equal(row.owner_acceptance.instrument_class_confirmation_required, false, 'with no outstanding instrument-class confirmation');
  check.equal(row.existing_operational_mapping.state, 'ESTABLISHED', 'with an established operational mapping');
  check.equal(row.existing_operational_mapping.legacy_rule_references[0].id, LEGACY_RULE_ID, 'bound to the recorded legacy atomic rule');
  check.equal(row.legacy_statute_or_provision.verification_state_as_recorded, 'verified=true', 'whose recorded rule row is marked verified');
  check.equal(row.established_jurisdiction_associations.canonical_jurisdiction_status, 'UK_TO_GB_RECONCILIATION_REQUIRED', 'recorded against the bare UK token, whose region relation the ledger leaves to be resolved');
  check.deepEqual(row.remaining_implementation_dependencies, ['REGISTER_DISPOSITION_UNRESOLVED'], 'whose only outstanding implementation dependency is the durable rescreen record');
  check.equal(row.register_state.blocker_type, 'NO_DURABLE_RESCREEN_RECORD', 'named exactly as the ledger names it');

  const retrieval = JSON.parse(fs.readFileSync(RETRIEVAL, 'utf8'));
  check.equal(retrieval.source_entry_id, 'CRP-LSRC-0407', 'the provision was retrieved from the official publisher rather than assumed');
  check.match(retrieval.instrument.publisher, /legislation\.gov\.uk/, 'from the official United Kingdom legislation publisher');
  check.match(retrieval.instrument.title, /United Kingdom General Data Protection Regulation/, 'naming the United Kingdom instrument');
  check.match(retrieval.located_provision_text.quoted_article_5_1_d, /accurate and, where necessary, kept up to date/, 'with the accuracy limb quoted verbatim');
  check.match(retrieval.located_provision_text.quoted_article_5_1_d, /erased or rectified without delay/, 'including its rectification-without-delay requirement');
  check.match(retrieval.located_provision_text.quoted_article_16, /right to obtain from the controller without undue delay the rectification of inaccurate personal data/, 'and the right to rectification quoted verbatim');
  check.equal(retrieval.attribution_check.result, 'SUPPORTS_THE_ASSESSMENT', 'with the implemented concern checked against that wording');
  check.match(retrieval.attribution_check.confidence_ceiling_justified, /PROBABLE_VIOLATION/, 'and the probable ceiling justified rather than assumed');
  check.equal(retrieval.wording_verification_status.article_5_1_d_wording, 'VERIFIED_FROM_THE_OFFICIAL_PUBLISHER', 'recording the wording as verified from the official publisher');
  check.equal(retrieval.wording_verification_status.sha256, null, 'asserting no page digest it did not compute');
  check.match(retrieval.territorial_extent.basis.join(' '), /U\.K\./, 'recording the instrument own geographical-extent marker as the basis of the region relation');
  check.match(retrieval.territorial_extent.what_this_does_not_rely_on, /NOT adopted/, 'and stating that the off-report token route was not used');
  check.equal(retrieval.temporal_applicability.status, 'APPLICABLE_EDITION_RECORDED', 'recording the applicable edition');
  check.match(retrieval.temporal_applicability.distinction_kept, /retention arithmetic/, 'and keeping temporal applicability apart from retention arithmetic');
  check.match(retrieval.applicable_edition.amendments_recorded_on_the_retrieved_pages.join(' '), /Data \(Use and Access\) Act 2025/, 'recording the amendments the publisher shows');
  check.equal(retrieval.applicable_edition.amendments_recorded_on_the_retrieved_pages.some((a) => /Article 5\(1\)\(d\)|Article 16/.test(a)), false,
    'none of which touches the accuracy limb or Article 16');
  check.match(retrieval.consumer_outcome.unchanged_and_separate, /CURRENT_GB_SUPPORT_IS_ESTABLISHED/, 'and leaving the current-format GB family gap explicitly separate');

  const rescreen = JSON.parse(fs.readFileSync(RESCREEN, 'utf8'));
  check.equal(rescreen.rescreen_disposition.adapter_id, ADAPTER_ID, 'the durable per-ID rescreen disposition is recorded rather than assumed away');
  check.equal(rescreen.rescreen_disposition.maximum_conclusion, 'probable_violation', 'recording the ceiling as a probable violation, never a definite one');
  check.equal(rescreen.rescreen_disposition.packet_eligible, false, 'with no packet permission widened to make it reachable');
  check.equal(rescreen.rescreen_disposition.report_field_mapping_used.additional_authorised_evidence_route_required, false, 'turning only on mapping that is already established and evidenced');
  check.equal(rescreen.retained_limitations.administrative_limitations_retained.length, 3, 'retaining every administrative limitation the ledger records');
  check.match(rescreen.retained_limitations.commencement, /NOT TREATED AS IRRELEVANT/, 'and not treating commencement as irrelevant');

  /* ---- the wiring ---- */
  const config = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === ADAPTER_ID);
  check.ok(config, 'the rule is configured in the runtime adapter configuration');
  check.equal(config.citation, CITATION, 'citing the retrieved provision');
  check.equal(config.legacy_rule_id, LEGACY_RULE_ID, 'under its recorded legacy atomic rule id');
  check.equal(config.source_entry_id, 'CRP-LSRC-0407', 'and its recorded source entry');
  check.equal(config.output_permission.max_conclusion, 'probable_violation', 'whose maximum conclusion is a probable violation');
  check.equal(config.output_permission.packet_eligible, false, 'with no packet permission granted');
  check.equal(config.presentation_required, 'GENERAL-BUREAU-REPORT', 'running on the admitted general bureau-report intake, not the GB family reader');
  check.match(config.limb, /accurate and, where necessary, kept up to date/, 'recording the provision own words rather than a gloss');
  check.equal(config.applicability.mode, 'EXPLICIT_REGION_RELATION', 'reaching its regions only through a recorded relation');
  check.equal(config.applicability.relation_id, RELATION_ID, 'naming that relation');

  const relation = ruleAdapters.APPLICABILITY.relations.find((r) => r.relation_id === RELATION_ID);
  check.ok(relation, 'the relation is recorded in the applicability records');
  check.equal(relation.country, 'GB', 'for the recorded country');
  check.match(relation.instrument, /United Kingdom General Data Protection Regulation/, 'naming the instrument the relation rests on');
  check.equal(relation.instrument_class, 'UK_WIDE_STATUTE_OR_REGULATION', 'with the instrument class recorded');
  check.deepEqual(relation.regions, GB_REGIONS, 'covering exactly the four canonical GB regions');
  check.equal(relation.region_rows.length, 4, 'with one named row per region');
  check.ok(relation.region_rows.every((r) => r.state.startsWith('CONFIRMED')), 'each of which is explicitly confirmed');
  check.equal(relation.execution, 'BOUND_TO_A_RECORDED_STATUTE_ADAPTER', 'and bound to the recorded adapter');
  check.match(relation.territorial_reach_basis, /geographical-extent marker/, 'resting on the instrument own recorded extent');

  for (const region of GB_REGIONS) {
    const offered = (ruleAdapters.adaptersForRegion(region) || []).filter((a) => a.adapter_id === ADAPTER_ID);
    check.equal(offered.length, 1, `${region}: the recorded rule is offered to this GB selection`);
    check.equal(offered[0].confirmed, true, `${region}: as a confirmed applicability`);
  }
  check.equal((ruleAdapters.adaptersForRegion('CA-NS') || []).filter((a) => a.adapter_id === ADAPTER_ID).length, 0,
    'and it is not offered outside GB');

  /* ---- 2. The positive case: upload -> Issue -> Wizzard -> correspondence -> approval -> entitled download. ---- */
  const owner = await service.unpaidAccount('cd-gb@example.test');
  const stranger = await service.unpaidAccount('cd-gb-stranger@example.test');
  const unpaid = await service.unpaidAccount('cd-gb-unpaid@example.test');
  const unpaidCase = (await service.request('POST', '/api/cases', { token: unpaid.token, body: { country: 'GB', region: 'GB-ENG' } })).json.case;
  const unpaidWrite = await service.request('POST', `/api/cases/${unpaidCase.case_id}/packet/correspondence`, { token: unpaid.token, body: { correspondence: DETAILS } });
  check.equal(unpaidWrite.status, 402, 'an unpaid account cannot reach the packet path');
  check.equal(unpaidWrite.json.error.code, 'SUBSCRIPTION_REQUIRED', 'with the subscription refusal');

  const subscription = await service.pay(owner, 'monthly');
  check.equal(subscription.response.accepted, true, 'the account holds an active subscription, so the paid steps are reachable');
  const paid = await assess(service, owner, 'GB-ENG', ['Fictional Creditor  Balance $100  Opened 01/01/2020  Closed 01/01/2019']);
  check.equal(paid.presentation, 'GENERAL-BUREAU-REPORT', 'the report is admitted through the general bureau-report intake');
  const view = (await service.request('GET', `/api/cases/${paid.caseId}/packet`, { token: owner.token })).json.view;
  const gb = gbIssue(view);
  check.ok(gb, 'the Wizzard offers the GB accuracy issue for selection');
  check.equal(gb.confidence, 'PROBABLE', 'as a probable issue, because the report shows the conflict but not which value is inaccurate');
  check.equal(gb.basis_type, 'CONTENT_FINDING', 'on a report-content basis, not a retention comparison');
  check.equal(gb.request_type, 'VERIFICATION', 'with a verification request');
  check.equal(gb.citation, CITATION, 'and the retrieved provision');
  check.equal(gb.rule_source_version, SOURCE_VERSION, 'bound to the recorded source version');
  check.equal(gb.eligible, true, 'and it is selectable for a packet');
  check.match(gb.explanation, /cannot both be right/, 'its explanation states what the report prints');
  check.match(gb.uncertainty, /Which of the two printed values is inaccurate is not established/, 'and names the specific uncertainty');
  check.match(gb.uncertainty, /benign explanation/, 'including the benign alternative rather than treating the conflict as proof');
  check.match(gb.uncertainty, /supports a verification request/, 'and requests verification of the conflict');
  check.match(gb.uncertainty, /Articles 5\(1\)\(d\) and 16/, 'naming the recorded provision in the consumer wording');
  check.equal((gb.source_facts || []).length, 2, 'with both printed readings as its decisive facts');

  /* the same printed conflict must reach the consumer ONCE, with both supported bases. */
  check.equal(view.eligible_issues.length, 1, 'exactly one issue is offered for this one printed conflict');
  check.equal(view.eligible_issues.filter((i) => i.confidence === 'POTENTIAL').length, 0, 'so the shared factual observation is not offered as a second card');
  const bases = gb.supported_bases || [];
  check.equal(bases.length, 2, 'the issue carries both of its supported bases');
  check.ok(bases.some((b) => b.basis_type === 'FACTUAL_CONSISTENCY' && b.check_kind === 'an account with contradictory dates'),
    'one base being the factual conflict the report prints');
  check.ok(bases.some((b) => b.basis_type === 'CONTENT_FINDING' && b.citation === CITATION), 'the other being the recorded UK rule it raises');
  check.equal(JSON.stringify(bases).includes('COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'), false, 'with no internal check id exposed to the consumer');
  check.equal(JSON.stringify(bases).includes(ADAPTER_ID), false, 'and no internal adapter id either');
  check.equal(issues.isEligible({ basis_type: 'CONTENT_FINDING', confidence: 'PROBABLE', packet_eligible: false }), true,
    'a probable content finding is packet-eligible by confidence, with no widened per-rule permission');

  check.equal((await service.request('POST', `/api/cases/${paid.caseId}/packet/select`, { token: stranger.token, body: { issue_ids: [gb.issue_id] } })).status, 403,
    'another account cannot select on this packet');
  check.equal((await service.request('GET', `/api/cases/${paid.caseId}/packet-download`, { token: stranger.token })).status, 403, 'nor download it');

  await service.request('POST', `/api/cases/${paid.caseId}/packet/select`, { token: owner.token, body: { issue_ids: [gb.issue_id] } });
  const selected = (await service.request('GET', `/api/cases/${paid.caseId}/packet`, { token: owner.token })).json.view;
  check.equal(selected.packet.selected_count, 1, 'the consumer selects the one coherent issue for this conflict');
  await service.request('POST', `/api/cases/${paid.caseId}/packet/correspondence`, { token: owner.token, body: { correspondence: DETAILS } });
  const approved = await service.request('POST', `/api/cases/${paid.caseId}/packet/approve`, { token: owner.token });
  check.equal(approved.status, 200, 'the packet approves');
  const dl = await service.request('GET', `/api/cases/${paid.caseId}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'and the entitled download succeeds');
  check.ok(dl.text.includes(gb.explanation), 'the downloaded correspondence carries the reviewed issue');
  check.ok(dl.text.includes(`Recorded rule: ${CITATION}`), 'naming the recorded rule behind the finding');
  check.ok(/Request \(verification\): /.test(dl.text), 'with a verification request, never a correction demand');
  check.ok(/rectify whichever is inaccurate/.test(dl.text), 'asking for rectification of the inaccurate value');
  check.ok(/opened_date_printed_on_this_record: printed "01\/01\/2020"/.test(dl.text), 'and the raw printed opened reading in the evidence references');
  check.ok(/closed_date_printed_on_this_record: printed "01\/01\/2019"/.test(dl.text), 'with the raw printed closed reading');
  check.ok(/normalized to 2020-01-01/.test(dl.text), 'with its normalization');
  check.ok(/Also rests on: what the report prints — an account with contradictory dates/.test(dl.text), 'naming its second supported base in plain language');
  check.equal((dl.text.match(/Request \(verification\): /g) || []).length, 1, 'with exactly one request for the one issue');
  check.ok(dl.text.includes('Rowan Ellis'), 'carrying the consumer-supplied correspondence details');
  check.ok(!/is an established reporting issue/i.test(dl.text), 'never asserting an established reporting issue for a probable one');
  check.ok(/supports a verification request/.test(dl.text), 'while stating the supported verification action');

  /* ---- 3. Benign controls. ---- */
  const consistent = await assess(service, owner, 'GB-ENG', ['Fictional Creditor  Balance $100  Opened 01/01/2018  Closed 01/01/2020']);
  const consistentView = (await service.request('GET', `/api/cases/${consistent.caseId}/packet`, { token: owner.token })).json.view;
  check.equal(gbIssue(consistentView), null, 'an account whose printed opened date precedes its closed date raises no GB issue');

  const scotland = await assess(service, owner, 'GB-SCT', ['Fictional Creditor  Balance $100  Opened 01/01/2020  Closed 01/01/2019']);
  const scotlandView = (await service.request('GET', `/api/cases/${scotland.caseId}/packet`, { token: owner.token })).json.view;
  check.ok(gbIssue(scotlandView), 'the same conflict in a second GB nation reaches the same recorded rule');

  const outsideCase = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case;
  const outsidePdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Fictional Creditor  Balance $100  Opened 01/01/2020  Closed 01/01/2019'] }] });
  await service.request('POST', `/api/cases/${outsideCase.case_id}/files`, { token: owner.token, body: uploadBody(outsidePdf, 'fictional-ca-report.pdf') });
  await service.request('POST', `/api/cases/${outsideCase.case_id}/evaluate`, { token: owner.token });
  const outsideView = (await service.request('GET', `/api/cases/${outsideCase.case_id}/packet`, { token: owner.token })).json.view;
  check.equal(gbIssue(outsideView), null, 'the same printed conflict outside GB raises no GB issue');
  check.ok((outsideView.eligible_issues || []).some((i) => i.confidence === 'POTENTIAL'), 'while the shared factual observation is still offered there');

  const oneDate = await assess(service, owner, 'GB-ENG', ['Fictional Creditor  Balance $100  Opened 01/01/2020']);
  const oneDateView = (await service.request('GET', `/api/cases/${oneDate.caseId}/packet`, { token: owner.token })).json.view;
  check.equal(gbIssue(oneDateView), null, 'a record printing only one of the two dates raises no GB issue');
  const oneDateReport = (await service.request('GET', `/api/cases/${oneDate.caseId}`, { token: owner.token })).json.view;
  check.equal(JSON.stringify(oneDateReport).includes('compliant'), false, 'and nothing claims that account is compliant');

  const unreadable = await assess(service, owner, 'GB-ENG', ['Fictional Creditor  Balance $100  Opened 02/03/2020  Closed 03/02/2019']);
  const unreadableView = (await service.request('GET', `/api/cases/${unreadable.caseId}/packet`, { token: owner.token })).json.view;
  check.equal(gbIssue(unreadableView), null, 'an ambiguous date convention that cannot be resolved raises no GB issue');
  const unreadableReport = (await service.request('GET', `/api/cases/${unreadable.caseId}`, { token: owner.token })).json.view;
  check.equal(JSON.stringify(unreadableReport).includes('no problem'), false, 'and a reading that could not be made is never reported as no problem');

  evidence.candidate = { source_entry_id: 'CRP-LSRC-0407', citation: CITATION, legacy_rule_id: LEGACY_RULE_ID, regions: GB_REGIONS, ceiling: 'probable_violation', packet_eligible: false };
  evidence.provision = {
    publisher: retrieval.instrument.publisher,
    edition: retrieval.applicable_edition.version_shown,
    located_article_5_1_d: retrieval.located_provision_text.quoted_article_5_1_d,
    located_article_16: retrieval.located_provision_text.quoted_article_16,
    extent_basis: 'the official publisher prints the U.K. geographical-extent marker on Articles 5 and 16',
    temporal_applicability: retrieval.temporal_applicability.status
  };
  evidence.positive = {
    case_id: paid.caseId,
    confidence: gb.confidence,
    request_type: gb.request_type,
    issues_offered: view.eligible_issues.length,
    supported_bases: bases.map((b) => b.basis_type),
    downloaded_chars: (dl.text || '').length
  };
  evidence.controls = [
    'a consistent account raises nothing',
    'the same conflict in a second GB nation reaches the same recorded rule',
    'the same printed conflict outside GB raises no GB issue and still offers the factual observation',
    'one printed date raises nothing and claims no compliance',
    'an ambiguous convention raises nothing and claims no problem',
    'the same conflict inside GB offers exactly one issue, with the duplicate factual card suppressed'
  ];
  evidence.retained_items = [
    'the current-format GB consumer-disclosure family artifact gap is untouched by this rule and remains open as its own intake gap',
    'the provision original commencement date is not recorded and is not claimed',
    'the ledger administrative limitations stay retained',
    'the remaining Canadian rows stay without a supported statutory path and are recorded once as blocked'
  ];
  return evidence;
}
