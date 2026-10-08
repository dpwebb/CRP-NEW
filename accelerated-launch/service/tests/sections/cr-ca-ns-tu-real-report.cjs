'use strict';
const { comparableText } = require('../packet-pdf-assertions.cjs');
/**
 * cr-ca-ns-tu-real-report.cjs — BLOCKER-REPORT-DATA-TO-ISSUE-001 (real-report core repair), October 6 2026.
 *
 * The owner's highest-priority core failure: the supplied real TransUnion Canada disclosure, assessed under a
 * Nova Scotia selection, returned ZERO issues even though the report itself shows an empty delinquency anchor on
 * an adverse collection entry, a write-off with no charge-off date and closures with no closure dates. This
 * section measures the repaired path end to end and keeps two kinds of evidence strictly apart:
 *
 *   • REAL — the digest-pinned TransUnion Canada specimen the repository already points at, read read-only
 *     through the live HTTP upload path and directly through the family reader. No private report is copied into
 *     source control.
 *   • SYNTHETIC — labelled in-memory structural models that exercise the reader's own measured column rule, the
 *     narrative-legend normalization (CRLF and LF) and the benign controls. They establish NO presentation
 *     evidence and are never mixed with the real readings.
 *
 * Nothing here names a statutory provision as satisfied or breached, opens a credential file or makes a network
 * call beyond the loopback service.
 */

const fs = require('node:fs');
const path = require('node:path');
const tuFamily = require('../../format-families/tu-ca-consumer.cjs');
const commonErrors = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const { makeSyntheticModel, buildPdfDocumentModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const LETTER = { width_pt: 612, height_pt: 792, label: 'letter' };
const SYNTHETIC_ADMISSION = Object.freeze({
  state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT',
  admitted: true, refusal_reason: null, fact_status: null, presentation_evidence: false
});
const CLOSURE_ITEM = 'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE';

/** The owner's authorized local copy of the supplied report, seeded from the repository's own register. */
function realReportPath() {
  return process.env.CRP_CA_TRANSUNION_SPECIMEN || null;
}

/* --------------------------------------------------------------- synthetic TransUnion Canada account blocks */

/**
 * One synthetic TU-CA account block. The date column positions, the table header and the boundary caption are the
 * ones measured on the real disclosure; the data row's cells are placed through the reader's own `tableColumns`,
 * so the reader's measured column rule — not a test's arithmetic — decides which column a cell belongs to. Every
 * parameter exists so a control can print exactly one thing differently.
 */
function tuAccountBlock(opts) {
  const o = opts || {};
  const creditor = o.creditor || 'EXAMPLE CREDITOR';
  const left = (label, value) => `${label.padEnd(30)}${value || ''}`;
  const right = (label, value) => `${' '.repeat(46)}${label}${value ? ` ${value}` : ''}`;
  const headerAbove = `${' '.repeat(114)}Balloon${' '.repeat(20)}Narrative`;
  const headerMain = '   Date       Balance      Payment        Past Due        MOP           Terms      High Credit Credit Limit                       Charge Off';
  const headerBelow = `${' '.repeat(114)}Payment${' '.repeat(23)}1/2`;
  const head = [
    'Creditor Name',
    `${creditor}${' '.repeat(Math.max(1, 108 - creditor.length))}Payment History`,
    `${left('Reported Date', o.reported || 'Oct 31, 2025')}${right('Last Payment Date', o.lastPayment || 'Oct 03, 2025')} Terms:          522/M           30    60   90     #M`,
    `${left('Opened Date', o.opened || 'Sep 03, 2020')}${right('Posted Date', o.posted || 'Nov 02, 2025')}                                  0     0    0      26`,
    `${left('Closed Date', o.closed || '')}${right('Charge Off Date', o.chargeOff || '')} Account         ${o.type || 'INSTALLMENT'} / INDIVIDUAL`,
    `${left('First Delinquency Date', o.firstDelinquency || '')}${right('Balloon Payment Date', '')}Type:`,
    headerAbove,
    headerMain,
    headerBelow
  ];
  const region = head.map((text, index) => ({ page: 1, line: index + 1, text }));
  const table = tuFamily.tableColumns(region);
  const edge = (key) => table.columns.find((column) => column.key === key).edge;
  const placements = [
    { end: 10, value: o.period || 'Oct 2025' },
    { end: edge('balance'), value: '248' },
    { end: edge('past_due'), value: '248' },
    { end: edge('mop'), value: o.mop || '9' },
    { end: edge('narrative'), value: o.narrative || 'WO / CG' }
  ].sort((a, b) => a.end - b.end);
  let row = '';
  for (const placement of placements) {
    const start = placement.end - placement.value.length;
    if (row.length < start) row += ' '.repeat(start - row.length);
    row += placement.value;
  }
  /* The legend line's own native ending is a parameter: the production lines end in a carriage return. */
  if (o.legend !== null && o.legend !== undefined) head.push(`Legend:    ${o.legend}${o.legendEnding === undefined ? '\r' : o.legendEnding}`);
  return head.concat([row]);
}

function tuExtraction(accountLines) {
  const model = makeSyntheticModel({ pages: [['Account(s)', ...accountLines]], page_count: 1, page_size: LETTER });
  const x = tuFamily.extract(model, SYNTHETIC_ADMISSION);
  for (const r of x.records) {
    r.source_bureau = 'TransUnion';
    r.source_report_reference_date = '2025-11-02';
  }
  return { presentation_id: tuFamily.FAMILY_ID, family_id: tuFamily.FAMILY_ID, records: x.records, reference_date: { normalized_value: '2025-11-02' } };
}

/** The consumer issue list for one extraction, through the real common-error + issue chain. */
function issuesFor(extraction) {
  const ce = commonErrors.runCommonErrorChecks({ extraction });
  return issues.issuesFor({ evaluation: { results: [], common_errors: ce }, extraction });
}

/** The check ids of a consumer issue list, sorted, so two lists can be compared as sets. */
function ids(issueList) {
  return issueList.map((i) => i.check_id).sort();
}

/* --------------------------------------------------------------------------------------------- the section */

async function runRealReport(service, check, evidence) {
  const specimen = realReportPath();
  if (!specimen || !fs.existsSync(specimen)) {
    /* OWNER Batch 33: an unavailable specimen is reported as a SKIP with its reason, never as a passing real-file
       test. The register pointer and the environment variable are the only sources for the path; when neither
       yields the file, nothing here asserts anything about the real report. */
    evidence.real_report = {
      available: false,
      reason: 'CRP_CA_TRANSUNION_SPECIMEN is not set on this machine, and the preserved register record holds the specimen identity and digest but not the file itself',
      register_status_as_recorded: tuFamily.readSecondCanadianPointer().register_status_as_recorded
    };
    check.skip('the supplied real TransUnion Canada report', evidence.real_report.reason);
    return null;
  }
  evidence.real_report = { available: true, bytes: fs.statSync(specimen).size, read_only: true };

  /* 1. The reader's own reading of the supplied report. */
  const model = buildPdfDocumentModel(specimen, { readWhenEncryptionPermitsCopy: true });
  const admission = tuFamily.admit(model);
  check.equal(admission.admitted, true, 'the supplied report is admitted by the TransUnion Canada contract');
  const x = tuFamily.extract(model, admission);
  const tradelines = x.records.filter((r) => r.kind === 'TU_CA_TRADELINE');
  const byName = {};
  for (const t of tradelines) byName[t.printed['Creditor Name'].raw] = t;
  check.equal(tradelines.length, 4, 'the supplied report carries four account blocks');
  check.deepEqual(Object.keys(byName).sort(),
    ['BANK OF NOVA SCOTIA', 'CAPITAL ONE BANK', 'FIDO', 'ROGERS COMMUNICATIONS CANADA INC'],
    'the four accounts are read under the names the report itself prints');

  /* 2. The printed legends are now READ (the carriage-return defect that emptied them). */
  check.equal(byName['BANK OF NOVA SCOTIA'].account_material.narrative_legend.AC,
    'Account closed/rating non derogatory', 'the bank entry legend carries the meaning the report prints');
  check.equal(byName['CAPITAL ONE BANK'].account_material.narrative_legend.WO, 'Bad debt write-off',
    'the write-off code carries the meaning the report prints');
  check.equal(byName['FIDO'].account_material.narrative_legend.TC,
    'Third party collection/account turned over to collection agency', 'the collection code carries its printed meaning');
  check.equal(byName['ROGERS COMMUNICATIONS CANADA INC'].account_material.narrative_legend.CZ,
    "Closed at consumer's request", 'the closure code carries its printed meaning');

  /* 3. Blank is not missing, and the printed delinquency date is mapped to the shared fact. */
  check.equal(byName['CAPITAL ONE BANK'].facts['tradeline.firstDelinquencyDate'], '2023-12-16',
    'the printed first-delinquency date reaches the shared fact vocabulary');
  check.equal(byName['FIDO'].printed['First Delinquency Date'].state, 'LABEL_PRINTED_WITHOUT_VALUE',
    'a caption the report prints with no value stays a printed blank');
  check.equal(byName['FIDO'].facts['tradeline.firstDelinquencyDate'], undefined,
    'and a printed blank maps no date at all');
  check.equal(byName['FIDO'].facts['tradeline.lastPaymentDate'], '2020-08-09',
    'the last payment the report prints on that entry is mapped');

  /* 4. The live upload path, the free assessment and the paid assessment. */
  const actor = await service.unpaidAccount('cr-ns-real@example.test');
  const created = await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'CA', region: 'CA-NS' } });
  const caseId = created.json.case.case_id;
  const bytes = fs.readFileSync(specimen);
  const up = await service.request('POST', `/api/cases/${caseId}/files`, {
    token: actor.token,
    body: { originalFilename: 'transunion-canada-consumer-disclosure.pdf', declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') }
  });
  check.equal(up.status, 201, 'the real report uploads through the live path with no format refusal');
  check.equal(up.json.receipt.format_detection.supported, true, 'and its format is supported');
  check.equal(up.json.receipt.format_detection.presentation_id, tuFamily.FAMILY_ID,
    'as the TransUnion Canada consumer presentation');
  check.equal(up.json.receipt.format_detection.refusal_reason, null, 'with no refusal reason recorded');
  const evaluated = await service.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token });
  check.equal(evaluated.status, 201, 'the free assessment runs');
  await service.pay(actor, 'report_once', caseId);
  const view = (await service.request('GET', `/api/cases/${caseId}`, { token: actor.token })).json.view;
  const publicIssues = view.result.issues;
  check.equal(view.assessment_summary.distinct_total, 7 + publicIssues.filter((i) => i.later_expiry_concern === true).length, 'the paid assessment reports the two historical-period concerns and the later-expiry concern');
  check.equal(view.assessment_summary.by_confidence.potential, 7 + publicIssues.filter((i) => i.later_expiry_concern === true).length, 'all of them are potential issues to verify');
  check.equal(view.assessment_summary.by_confidence.violation + view.assessment_summary.by_confidence.probable_violation, 0,
    'and none of them is asserted as a violation or a probable violation');
  check.equal(view.assessment_summary.teaser.severity, 'ADD_CONTENT', 'the teaser is ranked as a missing detail');
  check.ok(!/definite|violation/i.test(String(view.assessment_summary.teaser.title)),
    'and the teaser title never claims a violation');
  const byAccount = {};
  for (const i of publicIssues) byAccount[i.account_identity.name] = (byAccount[i.account_identity.name] || 0) + 1;
  check.deepEqual(byAccount, { FIDO: 3 + publicIssues.filter((i) => i.later_expiry_concern === true).length, 'CAPITAL ONE BANK': 2, 'BANK OF NOVA SCOTIA': 2, 'ROGERS COMMUNICATIONS CANADA INC': 2 },
    'the issues stay associated with the accounts the report shows them on');
  const reportingPeriod = publicIssues.filter((i) => i.reporting_period_concern === true);
  check.equal(reportingPeriod.length, 2, 'the two older closed debt entries receive historical reporting-period concerns');
  check.ok(reportingPeriod.every((i) => i.confidence === 'POTENTIAL' && /correct or remove/.test(i.explanation)),
    'the old debt information supports a direct correction request without claiming proof of a violation');
  check.ok(reportingPeriod.every((i) => i.source_evidence.page && i.source_evidence.line && i.account_identity.name),
    'both concerns preserve the account association and recorded report location');
  check.ok(reportingPeriod.every((i) => i.explanation.includes(i.account_identity.name)),
    'each reporting-period card names its tradeline in the explanation');

  /* The court-limitation items: two adverse debts whose printed dates may be outside the Nova Scotia time
     limit, counted from the LATEST printed date that can bear that relation, with the unknowns explicit. */
  const limitationItems = publicIssues.filter((i) => i.limitation_concern === true);
  check.equal(limitationItems.length, 2, 'two accounts carry a court-limitation concern');
  check.deepEqual(limitationItems.map((i) => i.account_identity.name).sort(), ['CAPITAL ONE BANK', 'FIDO'],
    'on the two accounts the report presents as unpaid adverse debts');
  check.ok(limitationItems.every((i) => i.limitation.jurisdiction_label === 'Nova Scotia'
    && i.limitation.basic_period_years === 2
    && /Limitation of Actions Act/.test(String(i.limitation.statute))),
    'each names the jurisdiction and the statute its period comes from');
  check.ok(limitationItems.every((i) => i.limitation.years_since > i.limitation.basic_period_years),
    'and each shows more years elapsed than the recorded period');
  check.ok(limitationItems.every((i) => (i.limitation.what_the_report_does_not_show || []).length >= 3),
    'while listing the conditions the report does not show');
  check.ok(limitationItems.every((i) => !i.citation && /Court time limits and credit-report time limits are separate/.test(String(i.uncertainty))),
    'and each states plainly that it is not a reporting-rule allegation and cites no retention rule');
  check.ok(limitationItems.every((i) => i.eligible === false && i.request_type === null && i.consumer_label === 'INFORMATION'),
    'each is information only and cannot enter a packet');
  const balanced = limitationItems.find((i) => i.account_identity.name === 'CAPITAL ONE BANK');
  check.equal(balanced.limitation.counted_from, 'Dec 16, 2023', 'the later printed date is the one counted from');
  check.equal(balanced.limitation.counted_from_label, 'First Delinquency Date', 'and it is named as the date it counted from');

  /* The payment-history analysis ran on the same report and found nothing adverse: its candidates are recorded
     with their benign explanations instead of being raised. */
  const paymentHistory = view.result.payment_history_analysis;
  check.equal(paymentHistory.summary.analyses, 3, 'three payment-history analyses ran on this report');
  check.equal(paymentHistory.summary.potential_issue, 0, 'and none is raised: this history is internally consistent');
  check.equal(paymentHistory.withheld_candidates.length, 7, 'while every candidate it refused to raise is recorded with its reason');
  check.ok(paymentHistory.withheld_candidates.every((c) => c.reason && c.missing_prerequisite),
    'each with the innocent explanation and the prerequisite it would need');
  check.ok(publicIssues.every((i) => i.limitation_concern ? i.request_type === null && i.eligible === false : i.request_type === 'VERIFICATION' && i.eligible === true),
    'only independent reporting issues remain available for disputes');
  check.ok(publicIssues.every((i) => !i.citation),
    'none of them names a legal rule, because none of them asserts one');
  evidence.real_report.issue_inventory = publicIssues.map((i) => ({
    account: i.account_identity.name,
    kind: i.limitation_concern ? 'court-limitation' : (i.missing_detail ? 'missing-detail' : 'other'),
    request_type: i.request_type,
    confidence: i.confidence
  }));
  return { actor, caseId, view, publicIssues };
}

/** The Nova Scotia reporting-period limb on the same report, and the paid boundary around the packet. */
async function runNovaScotiaLimb(service, check, evidence, real) {
  const view = real.view;
  const rows = (view.result.observations || []).filter((o) => /10\(3\)\(c\)/.test(o.check_name || ''));
  const obs = rows.filter((o) => o.assessment_completed !== false);
  check.equal(obs.length, 4, 'the Nova Scotia limb completes one comparison per account block of this report');
  check.ok(rows.every((o) => o.assessment_completed === true || /could not be read/.test(o.headline)),
    'and every other row it produced on this report is an unread record, never a comparison');
  check.ok(obs.every((o) => o.measures_from === 'Last Payment Date'),
    'and every completed run measures from the last payment date the report prints');
  check.ok(obs.every((o) => o.evidence && /^[A-Z][a-z]{2} \d{2}, \d{4}$/.test(String(o.evidence.printed_value))),
    'with the printed value of that date beside it');
  const exceeded = obs.filter((o) => /More than 6 years/.test(o.headline));
  check.equal(exceeded.length, 2, 'two entries are older than six years since the last payment the report prints');
  check.ok(exceeded.every((o) => o.is_a_finding === false && o.classification === null),
    'and both stay observations, because an aged but satisfactory, zero-balance entry is not asserted to be unlawful');
  check.ok((view.result.checks_not_run || []).every((c) => !/10\(3\)\(c\)/.test(c.citation || '')),
    'the presentation refusal that hid this limb on every TransUnion account is gone');
  check.equal((view.result.issues || []).filter((i) => i.citation).length, 0,
    'and the limb adds no consumer issue of its own');
  evidence.real_report.limb = obs.map((o) => ({
    account_number_in_report: o.account_number_in_report, measures_from: o.measures_from,
    printed_value: o.evidence.printed_value, is_a_finding: o.is_a_finding
  }));

  /* The paid boundary is unchanged: a one-time unlock opens the assessment; the packet belongs to a subscriber. */
  const packet = await service.request('GET', `/api/cases/${real.caseId}/packet`, { token: real.actor.token });
  check.equal(packet.status, 402, 'a one-time unlock still cannot open the dispute packet');
  check.equal(packet.json.error.code, 'SUBSCRIPTION_REQUIRED', 'which the recorded plans grant to subscribers only');
}

/** A subscriber selects one of the five supported issues from this same real report into a packet and approves it. */
async function runSubscriberPacket(service, check, evidence, real) {
  const sub = await service.account('cr-ns-real-sub@example.test');
  const created = await service.request('POST', '/api/cases', { token: sub.token, body: { country: 'CA', region: 'CA-NS' } });
  const caseId = created.json.case.case_id;
  const bytes = fs.readFileSync(realReportPath());
  await service.request('POST', `/api/cases/${caseId}/files`, {
    token: sub.token,
    body: { originalFilename: 'transunion-canada-consumer-disclosure.pdf', declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') }
  });
  await service.request('POST', `/api/cases/${caseId}/evaluate`, { token: sub.token });
  const view = (await service.request('GET', `/api/cases/${caseId}`, { token: sub.token })).json.view;
  const publicIssues = view.result.issues;
  check.equal(view.result.issues.length, 9 + publicIssues.filter((i) => i.later_expiry_concern === true).length, 'a subscriber sees the same supported issues on the real report');
  const chosen = view.result.issues.find((i) => i.reporting_period_concern === true);
  check.ok(chosen, 'the subscriber can select a historically old debt-information concern');
  const packetView = await service.request('GET', `/api/cases/${caseId}/packet`, { token: sub.token });
  check.equal(packetView.status, 200, 'the subscriber can open the packet flow for this report');
  const selected = await service.request('POST', `/api/cases/${caseId}/packet/select`, { token: sub.token, body: { issue_ids: [chosen.issue_id] } });
  check.equal(selected.status, 200, 'and can select one of the supported issues into the packet');
  await service.request('POST', `/api/cases/${caseId}/packet/correspondence`, {
    token: sub.token, body: { correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } }
  });
  await service.preparePostalPacket(sub, caseId);
  const approved = await service.request('POST', `/api/cases/${caseId}/packet/approve`, { token: sub.token });
  check.equal(approved.status, 200, 'and approve the packet it built');
  const download = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: sub.token });
  check.equal(download.status, 200, 'and download the approved packet');
  check.ok(comparableText(download.text).includes(chosen.request_wording), 'the approved correspondence carries the selected reporting-period verification request');
  check.ok(comparableText(download.text).includes(chosen.account_identity.name), 'the downloaded packet names the selected tradeline');
  check.ok(/remove or correct this debt information/i.test(comparableText(download.text)), 'the packet asks for correction of the aged debt information');
  check.ok(!/positive account|negative account|adverse debt/i.test(comparableText(download.text)), 'the packet assigns no positive or negative account value');
  evidence.real_report.packet = { selected_issue: chosen.issue_id, account: chosen.account_identity.name };
  void real;
}

/* ------------------------------------------------------------------ the synthetic controls (labelled as such) */

function runControls(check, evidence) {
  const AC = 'AC-Account closed/rating non derogatory';
  /* CRLF control: the production legend line ends in a carriage return. */
  const crlf = tuExtraction(tuAccountBlock({ creditor: 'CRLF CONTROL', narrative: 'AC /', mop: '1', legend: AC, legendEnding: '\r' }));
  check.equal(crlf.records[0].account_material.narrative_legend.AC, 'Account closed/rating non derogatory',
    'a legend line that ends in a carriage return is read');
  /* LF control: the same line without one reads identically, so the fix does not depend on the ending. */
  const lf = tuExtraction(tuAccountBlock({ creditor: 'LF CONTROL', narrative: 'AC /', mop: '1', legend: AC, legendEnding: '' }));
  check.equal(lf.records[0].account_material.narrative_legend.AC, 'Account closed/rating non derogatory',
    'and the same line without a carriage return reads the same');
  check.deepEqual(ids(issuesFor(crlf)), ids(issuesFor(lf)), 'and the two endings produce the same issue list');
  check.deepEqual(ids(issuesFor(crlf)), [CLOSURE_ITEM],
    'the closure code with no closed date is the only item that block supports');

  /* No legend: the report defines nothing, so no meaning is guessed and no issue is inferred from the code. */
  const noLegend = tuExtraction(tuAccountBlock({ creditor: 'NO LEGEND CONTROL', narrative: 'AC /', mop: '1', legend: null }));
  check.deepEqual(noLegend.records[0].account_material.narrative_legend, {}, 'a block that prints no legend yields no meanings');
  check.deepEqual(ids(issuesFor(noLegend)), [], 'and no closure item is inferred from a code the report never defines');

  /* Benign control: a block that prints the dates for its own events forces no issue. */
  const benign = tuExtraction(tuAccountBlock({
    creditor: 'COMPLETE CONTROL', narrative: 'WO / CG', mop: '9',
    closed: 'Jun 17, 2024', chargeOff: 'Jul 31, 2024', firstDelinquency: 'Dec 16, 2023',
    legend: 'CG-Account cancelled by credit grantor with derogatory rating, WO-Bad debt write-off', legendEnding: '\r'
  }));
  check.deepEqual(ids(issuesFor(benign)), [], 'a block that prints the dates for its own events forces no issue');

  /* An adverse entry that prints its delinquency date is never given a missing-anchor item. */
  const anchored = tuExtraction(tuAccountBlock({
    creditor: 'ANCHORED ADVERSE CONTROL', narrative: 'TC / CG', mop: '9', firstDelinquency: 'Aug 09, 2021',
    legend: 'CG-Account cancelled by credit grantor with derogatory rating, TC-Third party collection/account turned over to collection agency', legendEnding: '\r'
  }));
  check.deepEqual(ids(issuesFor(anchored)), [CLOSURE_ITEM],
    'an adverse entry that prints its delinquency date is never given a missing-anchor item');

  /* An aged, zero-balance, non-derogatory entry with its closure date printed forces nothing. */
  const settled = tuExtraction(tuAccountBlock({ creditor: 'AGED SATISFACTORY CONTROL', opened: 'Sep 03, 2005', narrative: 'AC /', mop: '1', closed: 'Oct 31, 2013', legend: AC, legendEnding: '\r' }));
  check.deepEqual(ids(issuesFor(settled)), [], 'an aged, zero-balance, non-derogatory entry forces nothing because it is old');

  /* A record of another kind is never lent to these completeness checks. */
  const foreign = {
    presentation_id: tuFamily.FAMILY_ID, family_id: tuFamily.FAMILY_ID,
    records: [{ record_index: 1, kind: 'COLLECTION', kind_label: 'collection entry', printed: {}, facts: {} }]
  };
  check.deepEqual(ids(issuesFor(foreign)), [], 'a record of another kind is never lent to these completeness checks');
  evidence.controls = 'CRLF/LF, no-legend, benign-complete, anchored-adverse, aged-satisfactory and foreign-kind controls, all synthetic and labelled';
}

async function run(service, check) {
  const evidence = { real_report: null, controls: null };
  const real = await runRealReport(service, check, evidence);
  if (real) {
    await runNovaScotiaLimb(service, check, evidence, real);
    await runSubscriberPacket(service, check, evidence, real);
  }
  runControls(check, evidence);
  return evidence;
}

module.exports = {
  run,
  id: 'cr-ca-ns-tu-real-report',
  title: 'BLOCKER-REPORT-DATA-TO-ISSUE-001: the supplied real TransUnion Canada report assessed under Nova Scotia — supported findings, the reporting-period limb and the paid boundaries'
};


