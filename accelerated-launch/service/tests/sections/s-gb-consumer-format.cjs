'use strict';
/**
 * s-gb-consumer-format.cjs — OWNER-ALL82-001 / B3 continuation. The United Kingdom consumer format.
 *
 * The owner directed: follow the official consumer-disclosure routes, use TARGETED retrieval for the missing
 * consumer representation, inspect official consumer report examples and establish exactly what each artifact
 * supports, never substitute subscriber or synthetic material for genuine consumer-format evidence, implement
 * a supported consumer-format adapter and meaningful factual checks, and label policy observations so they can
 * never be read as statutory findings.
 *
 * This section records all of that, and separates two kinds of evidence throughout:
 *   • REAL EVIDENCE — the captured official Experian United Kingdom consumer report example PUB-009, read
 *     where it already sits, posted to a loopback listener and evaluated end to end under all four canonical
 *     GB selections. Its digest is re-checked against the recorded capture before it is used.
 *   • SYNTHETIC — the same named GB checks driven over structural views built in memory, to exercise the
 *     not-applicable, unresolved, difference-found and not-examinable branches. A synthetic view is not a
 *     report and establishes no presentation evidence.
 *
 * What the artifact is, stated exactly: an addressed consumer letter headed "Your Credit Report", with the
 * consumer channel's own section skeleton and its own item numbering. What it is not: subscriber material, a
 * business report, or a bureau-to-lender layout — all three are refused by their own printed markers. Its own
 * face states that its information is fictitious and that it is issued for training and educational purposes,
 * so it evidences STRUCTURE only, and its June 2007 vintage is recorded as a remaining blocker.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const evaluation = require('../../evaluation.cjs');
const gbFamily = require('../../format-families/gb-experian-consumer.cjs');
const { buildPdfDocumentModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PUB_009 = path.join(ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30', 'PUB-009.pdf');
const PUB_012 = path.join(ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30', 'PUB-012.pdf');
const EVIDENCED_SHA256 = '5e95f3d27c4102c7772b33d0e11f3f4e0f37d253b2147e635db54e9bd328aec4';

const GB_REGIONS = ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS'];
const GB_CHECKS = [
  'GB-FACT-ITEM-DATE-AFTER-REPORT-DATE',
  'GB-FACT-DATE-ORDER-WITHIN-ITEM',
  'GB-PRINTED-RETENTION-POLICY-ON-ITEM'
];
const GB_RECORD_KINDS = ['GB_CREDIT_ACCOUNT', 'GB_PUBLIC_RECORD', 'GB_PREVIOUS_SEARCH'];

/* ------------------------------------------------------------------ the artifact's own admission */

function admissionOnTheRealArtifact(check, model) {
  const admitted = gbFamily.admit(model);
  check.equal(admitted.admitted, true, 'the captured consumer report example is admitted by the family structure');
  check.equal(admitted.state, 'ADMITTED_FAMILY_STRUCTURE');
  for (const predicate of admitted.predicates) {
    check.equal(predicate.passed, true, `admission predicate ${predicate.id} passes on the real artifact`);
    check.equal(predicate.refusal_reason, null, `and ${predicate.id} carries no refusal`);
  }
  check.equal(admitted.predicates.length, 9, 'every admission predicate is evaluated and recorded, not short-circuited');
  const ids = admitted.predicates.map((p) => p.id);
  for (const id of ['CONSUMER_CHANNEL_MARKERS_PRESENT', 'NO_WRONG_CHANNEL_MARKER', 'NO_FIXTURE_OR_SYNTHETIC_MARKER',
    'MODEL_IS_A_FILE_NOT_AN_IN_MEMORY_MODEL', 'REQUIRED_STRUCTURE_HEADINGS_PRESENT']) {
    check.ok(ids.includes(id), `the predicate ${id} is part of the contract and ran`);
  }
  return admitted;
}

/** Wrong-format and wrong-channel refusals, on real artifacts and on an in-memory lookalike. */
function wrongFormatRefusals(check, realModel) {
  if (fs.existsSync(PUB_012)) {
    const other = gbFamily.admit(buildPdfDocumentModel(PUB_012));
    check.equal(other.admitted, false, 'the captured Australian sample is refused by the GB family contract');
    check.ok(['NOT_THE_EVIDENCED_FAMILY_STRUCTURE', 'FAMILY_CONSUMER_CHANNEL_MARKERS_ABSENT'].includes(other.refusal_reason),
      'and the refusal names which part of the structure it failed');
    check.equal(other.fact_status, 'UNSUPPORTED_PRESENTATION', 'and it produces the unsupported-presentation status');
  }
  /* A subscriber document is refused by its own printed markers, not by its name or producer. */
  const subscriber = buildPdfDocumentModel(PUB_009);
  subscriber.pages[0].lines.push('TOTALVIEW SUBSCRIBER INTERPRETATION GUIDE');
  subscriber.pages[0].text += '\nTOTALVIEW SUBSCRIBER INTERPRETATION GUIDE\n';
  const refusedChannel = gbFamily.admit(subscriber);
  check.equal(refusedChannel.admitted, false, 'a subscriber marker on an otherwise admissible document refuses it');
  check.equal(refusedChannel.refusal_reason, 'FAMILY_WRONG_CHANNEL_MARKER');
  check.equal(refusedChannel.failed_predicate, 'NO_WRONG_CHANNEL_MARKER');

  const fixture = buildPdfDocumentModel(PUB_009);
  fixture.pages[0].lines.push('SYNTHETIC TEST INPUT');
  fixture.pages[0].text += '\nSYNTHETIC TEST INPUT\n';
  const refusedFixture = gbFamily.admit(fixture);
  check.equal(refusedFixture.admitted, false, 'a fixture marker refuses a document that satisfies every structural predicate');
  check.equal(refusedFixture.refusal_reason, 'FAMILY_SYNTHETIC_OR_FIXTURE_MARKER');

  check.equal(gbFamily.admit(buildPdfDocumentModel(PUB_009)).admitted, realModel.admitted,
    'and no mutation performed above changed the real artifact on disk');
  return { real_artifact_refusals: ['PUB-012_AND_A_MARKER_MUTATED_MODEL'], note: 'the mutations are in memory only' };
}

/* ------------------------------------------------------------------ the real journey */

async function realJourney(t, check, owner, bytes, region) {
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'GB', region } })).json.case.case_id;
  const upload = await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: { originalFilename: 'my-credit-report.pdf', declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') }
  });
  check.equal(upload.status, 201, `${region}: the captured consumer report example is accepted by the upload gate`);
  check.equal(upload.json.receipt.format_detection.supported, true, `${region}: and admitted as the supported format family`);
  check.equal(upload.json.receipt.format_detection.presentation_id, 'FAM-GB-EXP-CONSUMER');
  check.equal(upload.json.receipt.format_detection.read_support_is, 'EVIDENCED_STRUCTURAL_CONTRACT',
    `${region}: by an evidenced structural contract, not a pinned digest`);
  check.equal(upload.json.receipt.extraction_summary.presentation_evidence, true, `${region}: it supplies presentation evidence`);
  check.equal(upload.json.receipt.extraction_summary.reference_date_read, true, `${region}: its report date is read`);
  check.equal(upload.json.receipt.extraction_summary.accounts_read, 13,
    `${region}: five credit entries, five public records and three previous searches are read`);

  const evaluated = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(evaluated.status, 201, `${region}: the case evaluates`);
  const result = evaluated.json.result;
  check.equal(result.observations.length, 0, `${region}: no statutory comparison runs, because none is recorded for GB`);
  check.equal(result.checks_performed, result.report_consistency_checks.length + 2,
    `${region}: the performed count includes the account-dates and revolving balance/limit checks`);
  check.equal(result.report_consistency_checks.length, 3, `${region}: all three GB checks ran`);
  check.ok(result.report_consistency_checks.every((c) => c.is_a_finding === false), `${region}: none is a finding`);
  check.deepEqual([...new Set(result.report_consistency_checks.map((c) => c.check_class))].sort(),
    ['PRINTED_POLICY_OBSERVATION', 'REPORT_FACT_CONSISTENCY'],
    `${region}: and exactly one of them is a printed policy observation`);
  const policy = result.report_consistency_checks.find((c) => c.check_class === 'PRINTED_POLICY_OBSERVATION');
  check.match(policy.qualification, /not a finding that a rule was broken/, `${region}: the policy comparison says on its face that it is not a finding`);
  check.match(result.assessment.plain, /common-error checklist using \d+ factual checks/,
    `${region}: and the assessment says no rule for this place was compared`);
  check.deepEqual(result.assessment.kinds, ['REPORT_FACT_CONSISTENCY', 'PRINTED_POLICY_OBSERVATION', 'COMMON_ERROR']);
  check.equal(result.report_consistency_checks.filter((c) => c.agreement === 'A_DIFFERENCE_WAS_FOUND').length, 1,
    `${region}: one of the three checks reports a difference between two things the report prints`);

  const stored = t.service.store.state().files.filter((f) => f.case_id === caseId).pop().extraction;
  const view = stored.evidence_readings.factual_view;
  check.equal(view.report_text_retained, false, `${region}: the factual view retains no report text`);
  check.equal(view.policy_statements.filter((p) => p.printed).length, 4,
    `${region}: the report prints four retention statements about its own classes`);
  return { caseId, result, stored, view };
}

/** The same admitted extraction, evaluated under all four canonical GB selections. */
function everyGbRegion(check, extraction) {
  const perRegion = {};
  for (const region of GB_REGIONS) {
    const evaluated = evaluation.evaluateCase({ country: 'GB', region, extraction });
    const factual = evaluated.factual_checks;
    perRegion[region] = {
      statutory_checks_performed: evaluated.results.length,
      factual_checks_performed: factual ? factual.performed.length : 0,
      policy_observations: factual ? factual.performed.filter((c) => c.check_class === 'PRINTED_POLICY_OBSERVATION').length : 0,
      differences_found: factual ? factual.summary.a_difference_was_found : 0,
      assessment_kinds: evaluated.assessment_kinds
    };
    check.equal(evaluated.results.length, 0, `${region}: no statutory comparison runs for a GB selection`);
    check.equal(factual.performed.length, 3, `${region}: all three GB checks ran on the real artifact`);
    check.deepEqual(factual.summary.check_ids.slice().sort(), GB_CHECKS.slice().sort(), `${region}: and they are exactly the three named GB checks`);
    check.equal(factual.summary.statutory_checks_named, 0, `${region}: no statutory check is among them`);
    check.ok(factual.performed.every((c) => c.is_a_finding === false), `${region}: and none of them is a finding`);
  }
  return perRegion;
}

/* ------------------------------------------------------------------ the artifact's own printed facts */

function realEvidence(check, view, result) {
  const kinds = {};
  for (const record of view.records) kinds[record.kind] = (kinds[record.kind] || 0) + 1;
  check.deepEqual(Object.keys(kinds).sort(), GB_RECORD_KINDS.slice().sort(), 'the family reads exactly its three record kinds');
  check.equal(kinds.GB_CREDIT_ACCOUNT, 5, 'five credit entries are read from the artifact');
  check.equal(kinds.GB_PUBLIC_RECORD, 5, 'five public records are read from the artifact');
  check.equal(kinds.GB_PREVIOUS_SEARCH, 3, 'three previous searches are read from the artifact');

  const record = view.records.find((r) => r.kind === 'GB_PUBLIC_RECORD');
  check.equal(record.printed['Information type'].state, 'VALUE', 'a multi-word printed value is read across its own line');
  check.equal(record.printed['Information type'].raw, 'BANKRUPTCY ORDER', 'and it is read exactly as the report prints it');

  const difference = result.report_consistency_checks.find((c) => c.agreement === 'A_DIFFERENCE_WAS_FOUND');
  check.equal(difference.outcome, 'A_PRINTED_ITEM_DATE_IS_LATER_THAN_THE_REPORT_DATE',
    'the one difference this artifact yields is a printed date later than the report own date');
  check.equal(difference.evidence.report_date, '1 June 2007', 'and the report date is named as the report prints it');
  check.equal(difference.evidence.dates_later_than_the_report_date[0].printed_value, '03/12/07',
    'and the printed date that is later is named');
  check.equal(difference.evidence.dates_later_than_the_report_date[0].label, 'Discharged', 'with its own printed label');
  check.match(difference.headline, /no conclusion is drawn/, 'and the headline says on its face that no conclusion is drawn');

  const policy = result.report_consistency_checks.find((c) => c.check_class === 'PRINTED_POLICY_OBSERVATION');
  check.equal(policy.agreement, 'NO_DIFFERENCE_FOUND', 'the printed policy observation finds no entry outside its period');
  check.equal(policy.evidence.observation_class, 'PRINTED_POLICY_OBSERVATION_NOT_A_STATUTORY_FINDING',
    'and it is labelled as a policy observation, not a statutory finding');
  check.equal(policy.evidence.policy_statements_printed_by_the_report, 4, 'against the four statements the report prints');
  check.equal(policy.evidence.entries_examined, 5, 'across the five entries those four statements apply to');
  check.ok(policy.evidence.entries_examined >= 1, 'and at least one entry was genuinely compared');
  check.match(policy.headline, /not a finding that a rule was broken/, 'and it says so in plain words to the consumer');

  return {
    records_read: view.records.length,
    records_by_kind: kinds,
    printed_retention_statements: view.policy_statements.filter((p) => p.printed).map((p) => p.policy_id),
    differences_found: result.report_consistency_checks.filter((c) => c.agreement === 'A_DIFFERENCE_WAS_FOUND')
      .map((c) => ({ check: c.check_name, outcome: c.outcome })),
    no_difference_found: result.report_consistency_checks.filter((c) => c.agreement === 'NO_DIFFERENCE_FOUND').length,
    artifact_vintage: '1 June 2007 (the artifact prints its own report date); its currency for present-day GB consumer files is NOT established'
  };
}

/* ------------------------------------------------------------------ synthetic branches (no report evidence) */

const REFERENCE = { status: 'RESOLVED', reason: null, raw: '1 June 2007', normalized: '2007-06-01', source_field: 'Date of report:', location: null };

function printedField(state, raw, normalized) {
  const reason = state === 'NOT_PRINTED' ? 'LABEL_NOT_PRINTED_ON_THIS_RECORD' : (state === 'VALUE' ? null : state);
  return { state, raw: raw || null, normalized: normalized || null, reason, location: null, printed_times_in_record: 1 };
}

function viewOf(options) {
  const opts = options || {};
  const records = [];
  let index = 0;
  for (const [kind, list] of Object.entries(opts.by_kind || {})) {
    for (const printed of list) {
      index += 1;
      records.push({ record_index: index, kind, kind_label: kind.toLowerCase(), section: kind, boundary: { page: 1, line: index }, end: { page: 1, line: index }, page_read_failure: false, printed });
    }
  }
  return {
    view_id: 'SYNTHETIC_STRUCTURAL_VIEW_NOT_A_READING',
    presentation_id: null,
    source: 'in-memory synthetic structural view: not a report, not a reading, not presentation evidence',
    reference_date: opts.reference_date === undefined ? REFERENCE : opts.reference_date,
    summary_counts: [],
    records,
    identity_groups: [],
    policy_statements: opts.policy_statements || [],
    headings_printed: [],
    pages_not_read: [],
    report_text_retained: false,
    note: 'SYNTHETIC — establishes no presentation evidence.'
  };
}

function creditEntry(overrides) {
  const base = {
    Started: printedField('VALUE', '19/10/02', '2002-10-19'),
    Settled: printedField('NOT_PRINTED'),
    Defaulted: printedField('VALUE', '06/10/05', '2005-10-06'),
    'File updated for the period to': printedField('VALUE', '01/03/07', '2007-03-01')
  };
  return Object.assign(base, overrides || {});
}

function policyStatement(id, sentence, printed) {
  return {
    policy_id: id, sentence, printed, item_kind: 'GB_CREDIT_ACCOUNT',
    applies_when_field: 'Defaulted', applies_when_value_contains: null, applies_when_value_present: true,
    anchor_label: 'Defaulted', period_years: 6
  };
}

function runSynthetic(view) {
  const factualChecks = require('../../factual-checks.cjs');
  return factualChecks.runFactualChecks({ country: 'GB', region: 'SYNTHETIC', extraction: { evidence_readings: { factual_view: view } } });
}

function byId(run, id) {
  return [].concat(run.performed, run.not_examinable, run.not_applicable, run.unresolved_applicability).find((c) => c.check_id === id) || null;
}

function syntheticBranches(check) {
  const branches = {};
  const policy = policyStatement('SYN-POLICY-6Y', 'A statement the report prints.', true);

  /* A date printed on an entry later than the report's own date. */
  const late = runSynthetic(viewOf({
    reference_date: { status: 'RESOLVED', reason: null, raw: '1 June 2004', normalized: '2004-06-01', source_field: 'Date of report:', location: null },
    by_kind: { GB_CREDIT_ACCOUNT: [creditEntry()] },
    policy_statements: [policy]
  }));
  branches.item_date_after_report_date = byId(late, 'GB-FACT-ITEM-DATE-AFTER-REPORT-DATE');
  check.equal(branches.item_date_after_report_date.agreement, 'A_DIFFERENCE_WAS_FOUND', 'a date later than the report date is a difference');

  /* An order the printed labels fix, broken. */
  const order = runSynthetic(viewOf({
    by_kind: { GB_CREDIT_ACCOUNT: [creditEntry({ Started: printedField('VALUE', '19/10/06', '2006-10-19') })] },
    policy_statements: [policy]
  }));
  branches.date_order = byId(order, 'GB-FACT-DATE-ORDER-WITHIN-ITEM');
  check.equal(branches.date_order.agreement, 'A_DIFFERENCE_WAS_FOUND', 'a default before the account started is a difference');
  check.deepEqual(branches.date_order.evidence.pairs_out_of_order[0].pair, ['Started', 'Defaulted'], 'and the pair is named');

  /* An entry printed beyond the period the report itself states. */
  const beyond = runSynthetic(viewOf({
    reference_date: { status: 'RESOLVED', reason: null, raw: '1 June 2015', normalized: '2015-06-01', source_field: 'Date of report:', location: null },
    by_kind: { GB_CREDIT_ACCOUNT: [creditEntry()] },
    policy_statements: [policy]
  }));
  branches.policy_beyond_period = byId(beyond, 'GB-PRINTED-RETENTION-POLICY-ON-ITEM');
  check.equal(branches.policy_beyond_period.agreement, 'A_DIFFERENCE_WAS_FOUND', 'an entry beyond the stated period is a difference');
  check.equal(branches.policy_beyond_period.check_class, 'PRINTED_POLICY_OBSERVATION', 'and it is still only a policy observation');
  check.equal(branches.policy_beyond_period.evidence.observation_class, 'PRINTED_POLICY_OBSERVATION_NOT_A_STATUTORY_FINDING');
  check.match(branches.policy_beyond_period.plain, /not a finding that a rule was broken/, 'and its headline says so');

  /* A statement the report does NOT print is never read into it. */
  const notPrinted = runSynthetic(viewOf({
    by_kind: { GB_CREDIT_ACCOUNT: [creditEntry()] },
    policy_statements: [policyStatement('SYN-NOT-PRINTED', 'A statement this report does not print.', false)]
  }));
  branches.policy_not_printed = byId(notPrinted, 'GB-PRINTED-RETENTION-POLICY-ON-ITEM');
  check.equal(notPrinted.not_applicable.length, 1, 'a statement the report does not print leaves the policy observation inapplicable');
  check.equal(branches.policy_not_printed.reason, 'THE_REPORT_PRINTS_NONE_OF_THE_RETENTION_STATEMENTS_THIS_BUILD_RECORDS');

  /* No statement recorded at all, and an unreadable report date. */
  const noStatements = runSynthetic(viewOf({ by_kind: { GB_CREDIT_ACCOUNT: [creditEntry()] } }));
  check.equal(byId(noStatements, 'GB-PRINTED-RETENTION-POLICY-ON-ITEM').reason,
    'THIS_READER_RECORDS_NO_RETENTION_STATEMENT_FOR_THIS_PRESENTATION',
    'a presentation with no recorded statement runs no observation');
  const noDate = runSynthetic(viewOf({
    reference_date: { status: 'EXTRACTION_UNRESOLVED', reason: 'REPORT_DATE_LABEL_NOT_FOUND', raw: null, normalized: null, source_field: 'Date of report:', location: null },
    by_kind: { GB_CREDIT_ACCOUNT: [creditEntry()] },
    policy_statements: [policy]
  }));
  check.equal(noDate.unresolved_applicability.length, 2, 'an unreadable report date leaves both date-dependent GB checks unresolved');

  const empty = runSynthetic(viewOf({ by_kind: {} }));
  check.equal(empty.performed.length, 0, 'a presentation with no entry of any kind performs nothing');
  check.equal(empty.summary.performed + empty.summary.not_applicable + empty.summary.applicability_unresolved
    + empty.summary.not_examinable, 3, 'and every registered GB check is still accounted for in exactly one bucket');

  for (const [name, outcome] of Object.entries(branches)) {
    if (!outcome || !outcome.check_id) continue;
    check.equal(outcome.is_a_finding, false, `synthetic ${name}: never a finding`);
  }
  return {
    synthetic_structural_views_only: true,
    establishes_no_presentation_evidence: true,
    branches_exercised: Object.keys(branches).sort()
  };
}

/* ------------------------------------------------------------------ the section */

async function run(t, check) {
  if (!fs.existsSync(PUB_009)) {
    check.skip('the United Kingdom consumer format', 'THE_CAPTURED_CONSUMER_REPORT_EXAMPLE_PUB-009_IS_NOT_PRESENT');
    return { skipped: true, reason: 'THE_CAPTURED_CONSUMER_REPORT_EXAMPLE_PUB-009_IS_NOT_PRESENT' };
  }
  const bytes = fs.readFileSync(PUB_009);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  check.equal(digest, EVIDENCED_SHA256, 'the artifact on disk still matches the digest the family contract evidences');

  const model = buildPdfDocumentModel(PUB_009);
  const admitted = admissionOnTheRealArtifact(check, model);
  const refusals = wrongFormatRefusals(check, admitted);

  const owner = await t.account('gb-format-owner@example.test');
  const eng = await realJourney(t, check, owner, bytes, 'GB-ENG');
  const facts = realEvidence(check, eng.view, eng.result);
  const perRegion = everyGbRegion(check, eng.stored);
  check.equal(Object.keys(perRegion).length, 4, 'all four canonical GB selections were evaluated');

  /* The same artifact put through a DIFFERENT market's gate: a GB consumer report is not a US disclosure. */
  const wrongMarket = await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } });
  const wrongUpload = await t.request('POST', `/api/cases/${wrongMarket.json.case.case_id}/files`, {
    token: owner.token,
    body: { originalFilename: 'report.pdf', declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') }
  });
  check.equal(wrongUpload.status, 201, 'the UK artifact is measured for a United States selection too');
  check.equal(wrongUpload.json.receipt.format_detection.presentation_id, 'GENERAL-BUREAU-REPORT',
    'and it is admitted only by the general intake, never as the US disclosure family');
  check.notEqual(wrongUpload.json.receipt.format_detection.presentation_id, 'US-CONSUMER-DISCLOSURE',
    'so it is not read as the United States consumer disclosure');

  const synthetic = syntheticBranches(check);

  check.ok(!t.logText().includes(PUB_009), 'the artifact path never reaches a log record');

  const demo = await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'GB', region: 'GB-ENG' } });
  await t.request('POST', `/api/cases/${demo.json.case.case_id}/demonstration`, { token: owner.token, body: { scenario: 'TWO_ACCOUNTS' } });
  const demoView = (await t.request('GET', `/api/cases/${demo.json.case.case_id}`, { token: owner.token })).json.view.result;
  check.equal(demoView.report_consistency_checks.length, 0, 'a demonstration model produces no GB factual check, because it is not a report');

  for (const caseId of [eng.caseId, wrongMarket.json.case.case_id, demo.json.case.case_id]) {
    check.equal((await t.request('DELETE', `/api/cases/${caseId}`, { token: owner.token })).status, 200);
  }
  check.equal(t.blobFiles().length, 0, 'nothing of the artifact is left on disk');

  return {
    skipped: false,
    presentation_id: 'FAM-GB-EXP-CONSUMER',
    evidenced_artifact_id: 'PUB-009',
    evidenced_sha256: EVIDENCED_SHA256,
    admissions: { predicates: admitted.predicates.length, refused_wrong_format_and_channel: refusals },
    real_evidence: facts,
    regions: perRegion,
    regions_with_a_working_assessment: GB_REGIONS.slice().sort(),
    synthetic
  };
}

module.exports = {
  run,
  id: 's-gb-consumer-format',
  title: 'The United Kingdom consumer format, its factual checks and its explicitly labelled policy observations'
};





