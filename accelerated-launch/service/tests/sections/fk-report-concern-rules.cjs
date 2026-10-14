'use strict';

/* Predicate, source custody and consumer projection coverage. Positioned PDF
 * ingestion, packet custody and UI journeys are exercised by the integration
 * section, not by replacing source reading with canonical facts here. */
const concerns = require('../../report-concerns.cjs');
const issues = require('../../issues.cjs');
const common = require('../../common-errors.cjs');
const { CHECKS, checklistFor } = require('../../common-error-checklist.cjs');
const { SOURCES } = require('../../report-concern-sources.cjs');

function location(line = 10) {
  return { page: 1, line, source: 'NATIVE_TEXT', trusted: true,
    file_id: 'fictional-source', bbox: [40, line * 12, 500, line * 12 + 10] };
}
function reference(date = '2026-06-06') {
  return { raw: date, normalized_value: date, status: 'RESOLVED', trusted: true,
    source_field: 'Report prepared date', location: location(2) };
}
function record(index = 1, extras = {}) {
  const own = { record_index: index, kind: 'GENERAL_ACCOUNT', kind_label: 'account', status: 'RESOLVED',
    bureau: 'Equifax', source_bureau: 'Equifax', source_file_id: 'fictional-source',
    report_reference_date: reference(), location: location(10), facts: {}, fact_sources: {},
    table_row_coverage: { complete: true, section: 'ACCOUNT_SUMMARY', row_id: `fictional-row-${index}`,
      field_presence: { closed_date: false }, location: location(10) } };
  field(own, 'account.reported_identity', 'Fictional Cedar Bank', 'Creditor');
  field(own, 'account.status', 'OPEN', 'Status');
  field(own, 'account.balance', 1860, 'Balance', '$1,860.00');
  for (const [name, value] of Object.entries(extras)) field(own, name, value, name);
  return own;
}
function field(own, name, value, caption, raw = value) {
  own.facts[name] = value;
  own.fact_sources[name] = { normalized_value: value, raw_value: typeof raw === 'object' ? JSON.stringify(raw) : raw,
    source_field: caption, status: 'RESOLVED', trusted: true, caption_count: 1,
    record_index: own.record_index, location: location(11) };
  return own;
}
function context(records = [], evidence = [], country = 'AU', region = `${country}-${country === 'AU' ? 'ACT' : country === 'US' ? 'CA' : country === 'GB' ? 'ENG' : 'ON'}`) {
  const extraction = { support: 'ACTUAL_REPORT_EVIDENCE', presentation_id: 'GENERAL-BUREAU-REPORT',
    bureau: 'Equifax', source_file_id: 'fictional-source', reference_date: reference(), records,
    report_concern_evidence: evidence };
  const evaluation = { country, region, presentation: extraction.presentation_id, results: [],
    support: 'ACTUAL_REPORT_EVIDENCE', common_errors: common.runCommonErrorChecks({ extraction }) };
  evaluation.report_concerns = concerns.measure(extraction, evaluation);
  return { extraction, evaluation };
}
function address(locality = 'Melbourne', state = 'ACT', postcode = '2149') {
  return { kind: 'ADDRESS_COMPONENTS', role: 'CURRENT', components: { locality, state, postcode },
    raw_value: `${locality} ${state} ${postcode}`, source_field: 'Current Address', trusted: true,
    source_bureau: 'Equifax', source_file_id: 'fictional-source', report_reference_date: reference(), location: location(5) };
}
function tfn() {
  return { kind: 'IDENTIFIER_FIELD', identifier_type: 'TFN', masked: true,
    raw_value: 'Tax file number shown (masked)', source_field: 'Tax File Number', trusted: true,
    source_bureau: 'Equifax', source_file_id: 'fictional-source', report_reference_date: reference(), location: location(6) };
}
function byKind(ctx, kind) { return issues.issuesFor(ctx).filter((issue) => issue.concern_kind === kind); }
const copy = (value) => JSON.parse(JSON.stringify(value));

async function run(_service, check) {
  check.equal(new Set(CHECKS.map((item) => item.check_id)).size, CHECKS.length, 'check IDs remain unique');
  for (const kind of concerns.KINDS) {
    check.ok(CHECKS.some((item) => item.check_id === concerns.CHECK_BY_KIND[kind]), `${kind}: governed checklist entry exists`);
    check.ok(common.FACTUAL_CHECK_CAPABILITY[concerns.CHECK_BY_KIND[kind]], `${kind}: capability entry is explicit`);
  }

  const paid = record();
  field(paid, 'account.reportRemarks', 'Consumer states collection was paid before latest report.', 'Remarks');
  const positive = context([paid]), payment = byKind(positive, 'PAID_CLAIM')[0];
  check.equal(payment?.classification, 'NON_VIOLATION', 'a consumer payment claim is a completed review concern');
  check.equal(payment?.eligible, true, 'the own sourced payment claim supports a verification request');
  check.equal(payment?.request_type, 'VERIFICATION', 'the review never requests a proven-violation correction');
  check.equal(paid.facts['account.status'], 'OPEN', 'a payment claim does not replace the reported status');
  check.equal(payment?.rule_assessment, undefined, 'the claim is not a rule-breach finding');
  check.match(payment.explanation, /records a claim/, 'wording preserves the claim attribution');
  check.equal(/I (?:paid|settled)|payment cleared/i.test(payment.request_wording), false, 'the letter does not invent a consumer payment story');
  check.equal(common.paidOrSettledShownUnpaid([paid]), null, 'the existing paid-status violation predicate remains unchanged');

  for (const [label, amend] of [
    ['creditor statement', (r) => field(r, 'account.reportRemarks', 'Creditor states account was paid.', 'Remarks')],
    ['payment as agreed', (r) => field(r, 'account.reportRemarks', 'Consumer states the account was paid as agreed.', 'Remarks')],
    ['partial payment', (r) => field(r, 'account.reportRemarks', 'Consumer states collection was partially paid.', 'Remarks')],
    ['payment negation', (r) => field(r, 'account.reportRemarks', 'Consumer states collection was not paid.', 'Remarks')],
    ['future payment promise', (r) => field(r, 'account.reportRemarks', 'Consumer says this will be paid next month.', 'Remarks')],
    ['future settlement promise', (r) => field(r, 'account.reportRemarks', 'Consumer reports the debt will be settled in full next week.', 'Remarks')],
    ['conditional payment statement', (r) => field(r, 'account.reportRemarks', 'Consumer states if the debt is settled in full the balance should be zero.', 'Remarks')],
    ['consistent paid status', (r) => field(r, 'account.status', 'PAID', 'Status')],
    ['partial settlement', (r) => field(r, 'account.status', 'SETTLED', 'Status')],
    ['zero balance', (r) => field(r, 'account.balance', 0, 'Balance', '$0.00')],
    ['historical default amount', (r) => field(r, 'account.balance', 1860, 'Original default amount', '$1,860.00')],
    ['rejected remark source', (r) => { r.fact_sources['account.reportRemarks'].trusted = false; }],
    ['remark belongs to another account', (r) => { r.fact_sources['account.reportRemarks'].record_index = 8; }],
    ['remark from another file', (r) => { r.fact_sources['account.reportRemarks'].location.file_id = 'other-file'; }]
  ]) {
    const next = copy(paid); amend(next);
    check.equal(byKind(context([next]), 'PAID_CLAIM').length, 0, `${label}: no payment-claim concern is manufactured`);
  }
  const creditorPaid = copy(paid);
  field(creditorPaid, 'account.status', 'PAID IN FULL', 'Status');
  const oldPaid = issues.issuesFor(context([creditorPaid])).find((item) => item.check_id === 'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID');
  check.equal(issues.consumerLabel(oldPaid), 'VIOLATION', 'the existing sourced paid-in-full contradiction keeps its violation label');

  const closed=record(2);field(closed,'account.closureStatement','Closed at consumer request','Remarks');
  const history=record(3);field(history,'account.undatedPaymentHistory',{tokens:['OK','30'],count:2,periods_printed:false,legend_printed:false},'Payment History');
  for(const country of ['AU','CA','US','GB']) {
    const ctx=context([closed,history],[],country);
    for(const kind of ['CLOSURE_DATE_REVIEW','UNDATED_PAYMENT_HISTORY','AU_AMOUNT_CATEGORY_REVIEW'])check.equal(byKind(ctx,kind).length,0,country+': normal fields and missing interpretation are not dispute findings');
  }
  check.equal(history.facts['account.paymentHistoryCells'],undefined,'precision correction never invents history dates or meanings');
  const geography = byKind(context([], [address()]), 'ADDRESS_GEOGRAPHIC_INCONSISTENCY')[0];
  check.equal(issues.consumerLabel(geography), 'VIOLATION', 'a verified locality/state mismatch is a source-linked checklist violation');
  check.equal(geography.eligible, true, 'report-level geographic evidence supports verification');
  check.equal(geography.rule_assessment.supporting_statutes.length, 0, 'no privacy-statute breach is invented');
  check.equal(issues.publicIssue(geography).preview_category, 'RESPONSIBILITY_IDENTITY', 'geography uses the governed identity preview category');
  check.equal(geography.source_facts[0].raw_value, 'Melbourne ACT 2149', 'the exact safe reader source value is retained');
  check.equal(JSON.stringify(geography).includes('123 PRIVATE STREET'), false, 'address evidence contains no street identity');
  for (const [label, item] of [
    ['correct locality/state', address('Melbourne', 'VIC', '3000')],
    ['postcode alone', address('Melbourne', 'VIC', '2149')],
    ['unknown locality', address('Unmapped Town', 'ACT', '2149')],
    ['unknown state', address('Melbourne', 'XX', '2149')],
    ['untrusted address', { ...address(), trusted: false }],
    ['postal exception', { ...address(), postal_exception: true }],
    ['unsafe full-address reading', { ...address(), raw_value: '123 PRIVATE STREET Melbourne ACT 2149' }]
  ]) check.equal(byKind(context([], [item]), 'ADDRESS_GEOGRAPHIC_INCONSISTENCY').length, 0, `${label}: no geographic violation is inferred`);
  check.equal(byKind(context([], [{ ...address('Canberra', 'VIC', '3072'), role: 'PREVIOUS' }]),
    'ADDRESS_GEOGRAPHIC_INCONSISTENCY').length, 1, 'a factual geographic mismatch can be checked in a former address without alleging identity theft');
  for (const [country, locality, state, code, expected] of [
    ['CA', 'Toronto', 'NS', 'M5H 2N2', 'ON'], ['CA', 'Halifax', 'ON', 'B3J 3A5', 'NS'],
    ['US', 'Washington', 'VA', '20024', 'DC'], ['US', 'Beverly Hills', 'NY', '90210', 'CA']
  ]) {
    const item = address(locality, state, code);
    const found = byKind(context([], [item], country), 'ADDRESS_GEOGRAPHIC_INCONSISTENCY')[0];
    check.equal(found?.evidence.expected_state, expected, `${country}: the exact verified locality/code pair supports the regional comparison`);
    const valid = address(locality, expected, code);
    check.equal(byKind(context([], [valid], country), 'ADDRESS_GEOGRAPHIC_INCONSISTENCY').length, 0,
      `${country}: the exact valid pair is benign`);
    const unknownPair = address(locality, state, country === 'CA' ? 'A1A 1A1' : '12345');
    check.equal(byKind(context([], [unknownPair], country), 'ADDRESS_GEOGRAPHIC_INCONSISTENCY').length, 0,
      `${country}: locality alone or an arbitrary code cannot substitute for the verified pair`);
  }

  for(const masked of [true,false])check.equal(byKind(context([],[{...tfn(),masked,raw_value:masked?'Tax file number shown (masked)':'Tax file number shown (unmasked)'}]),'AU_TFN_HANDLING').length,0,'identifier presence alone does not establish a handling concern');
  for(const amount of [0,100,1860]){const ordinary=record();field(ordinary,'account.balance',amount,'Balance');field(ordinary,'account.paymentAmount',0,'Payment Amount');check.equal(byKind(context([ordinary]),'AU_AMOUNT_CATEGORY_REVIEW').length,0,'ordinary amount '+amount+' does not need explanation');}
  for (const concern of [payment, geography]) {
    check.equal(issues.isEligible(copy(concern)), true, `${concern.concern_kind}: persisted original evidence remains eligible`);
    const publicView = issues.publicIssue(concern);
    let projected = publicView;
    for (let step = 0; step < 3; step += 1) projected = issues.projectConsumerIssue(copy(projected));
    check.equal(projected.consumer_label, concern.non_violation ? 'NON-VIOLATION CONCERN' : 'VIOLATION',
      `${concern.concern_kind}: labels survive repeated public/saved/PDF projections`);
    check.equal(publicView.title, concern.title, `${concern.concern_kind}: the public card receives the completed concern title`);
    check.equal(publicView.report_concern, true, `${concern.concern_kind}: the public review is marked separately`);
    check.equal(issues.isEligible(publicView), false, `${concern.concern_kind}: a public card is not a packet-eligibility certificate`);
    const edited = copy(concern); edited.source_facts[0].raw_value = 'invented reading';
    check.equal(issues.isEligible(edited), false, `${concern.concern_kind}: changing decisive evidence revokes eligibility`);
  }
  check.equal(issues.isEligible({ basis_type: 'REPORT_CONCERN', confidence: 'POTENTIAL', classification: 'NON_VIOLATION' }), false,
    'arbitrary manual review objects are never eligible');
  const missingScope = context([paid]); delete missingScope.evaluation.country;
  check.equal(concerns.concernsFor(missingScope.extraction, missingScope.evaluation).length, 0,
    'missing country scope produces no invented concern');
  const demo = context([paid]); demo.extraction.support = 'DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT';
  check.equal(concerns.concernsFor(demo.extraction, demo.evaluation).length, 0,
    'demonstration evidence cannot become consumer concerns');
  const measured = context([paid, closed, history], [address(), tfn()]);
  check.equal(measured.evaluation.report_concerns.performed.length, 2, 'all six mechanisms measure supported own report facts');
  for (const id of ['ADDRESS_GEOGRAPHIC_INCONSISTENCY','PAID_CLAIM'].map(kind=>concerns.CHECK_BY_KIND[kind])) {
    check.equal(checklistFor(measured.evaluation).find((entry) => entry.check_id === id).state, 'PERFORMED',
      `${id}: source-backed performed state reaches the shared checklist`);
    check.equal(checklistFor({ common_errors: { performed: [] } }).find((entry) => entry.check_id === id).state, 'NOT_PERFORMED',
      `${id}: a selector alone never claims performance`);
  }
  return { scope: 'six concern predicates, source custody, selected verification eligibility and public labels',
    jurisdiction_boundary: 'Shared factual reviews; narrowly sourced AU/CA/US geography; AU-only identifier and credit-data category context.' };
}

module.exports = { run, id: 'fk-report-concern-rules', title: 'Source-linked violation and non-violation concern determination' };
